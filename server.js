const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const ds = require('./datastore');
const secret = require('./keys');

const datastore = ds.datastore;

app.enable('trust proxy');
app.use('/', require('./index'));

const USER = "User";

// Handlebars
var { engine } = require('express-handlebars');
app.engine('.hbs', engine({extname: '.hbs'}));
app.set('view engine', '.hbs');

// Auth0
const { auth, requiresAuth } = require('express-openid-connect');

function create_secret() {
    const valid_char = '0123456789abcdefghijklmnopqrstuvqxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = 10; i> 0; --i) {
        result += valid_char[Math.floor(Math.random() * valid_char.length)]
    }
    return result;
}

const CLIENT_ID = secret.client_id;
const CLIENT_SECRET = secret.client_secret;
const DOMAIN = 'cs493-wonglo-portfolio.us.auth0.com';
const BASE_URL = 'https://portfolio-wonglo.uc.r.appspot.com';

const config = {
    routes: {
        login: false
    },
    authRequired: false,
    auth0Logout: true,
    secret: create_secret(),
    baseURL: BASE_URL,
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    issuerBaseURL: `https://${DOMAIN}`,
    authorizationParams: {
      response_type: 'code id_token',
    }
};

/* ------------- Begin User Model Functions ------------- */
function post_user(name, sub){
  var key = datastore.key(USER);
const new_user = {"name": name, "sub": sub};
return datastore.save({"key": key, "data": new_user}).then(() => {return key});
}

function get_users() {
  const q = datastore.createQuery(USER);
  return datastore.runQuery(q).then((entities) => {
      // Use Array.map to call the function fromDatastore. This function
      // adds id attribute to every element in the array at element 0 of
      // the variable entities
      return entities[0].map(ds.fromDatastore);
  });
}

/* ------------- End Model Functions ------------- */

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

app.use(bodyParser.json());

app.get('/login', (req, res) => {
  res.oidc.login({ returnTo: '/profile' })
});

app.get('/profile', requiresAuth(), (req, res) => {
  req.oidc.fetchUserInfo()
      .then( (userInfo) => {
          get_users()
              .then(users => {
                  if (users.some(user => user.sub === userInfo.sub)) {
                    res.json({
                      "sub": userInfo.sub,
                      "jwt": req.oidc.idToken
                    }).end();
                  } else {
                    post_user(userInfo.name, userInfo.sub);
                    res.json({
                      "sub": userInfo.sub,
                      "jwt": req.oidc.idToken
                    }).end();
                  }
              })
      })
});

// Get all users
app.get('/users', function(req, res){
  get_users()
      .then( (users) => {
          res.status(200).json(users);
      });
});

app.post('/users', function (req, res){
  res.set('Allow', 'GET');
  res.status(405).end();
});


// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});