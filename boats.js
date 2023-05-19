const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');
const app = express();
const request = require('request');

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const datastore = ds.datastore;

const BOAT = "Boat";
const LOAD = "Load";

const DOMAIN = 'cs493-wonglo-portfolio.us.auth0.com';
const BASE_URL = 'https://portfolio-wonglo.uc.r.appspot.com';

router.use(bodyParser.json());

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
    }),
    
    // Validate the audience and the issuer.
    issuer: `https://${DOMAIN}/`,
    algorithms: ['RS256']
  });


/* ------------- Begin Boat Model Functions ------------- */
function post_boat(name, type, length, sub){
    var key = datastore.key(BOAT);
	const new_boat = {"name": name, "type": type, "length": length, "owner": sub, "loads": []};
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

function get_boat(boat_id) {
    const key = datastore.key([BOAT, parseInt(boat_id, 10)]);
    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity found. Don't try to add the id attribute
            return entity;
        } else {
            // Use Array.map to call the function fromDatastore. This function
            // adds id attribute to every element in the array entity
            return entity.map(ds.fromDatastore);
        }
    });
}

function get_boats(){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(ds.fromDatastore);
		});
}

function get_all_boats(req){
    var q = datastore.createQuery(BOAT).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.boats = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "/boats" + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}

function get_owner_boats(req, owner){
    var q = datastore.createQuery(BOAT).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
        results.boats = entities[0].map(ds.fromDatastore).filter(item => item.owner === owner);
        if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "/boats" + "?cursor=" + entities[1].endCursor;
        }
        return results;
	});
}

function get_owner_boats_count(owner){
    var q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
        results = entities[0].map(ds.fromDatastore).filter(item => item.owner === owner).length;
        return results;
	});
}

function get_all_boats_count(){
    var q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
        results = entities[0].map(ds.fromDatastore).length;
        return results;
	});
}

function get_all_loads() {
    const q = datastore.createQuery(LOAD);
    return datastore.runQuery(q).then((entities) => {
        return entities[0].map(ds.fromDatastore);
    });
}

function get_load(load_id) {
    const key = datastore.key([LOAD, parseInt(load_id, 10)]);
    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity found. Don't try to add the id attribute
            return entity;
        } else {
            // Use Array.map to call the function fromDatastore. This function
            // adds id attribute to every element in the array entity
            return entity.map(ds.fromDatastore);
        }
    });
}

function add_self(id, name, type, length, sub, url){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length, "owner": sub, "loads": [], "self": url};
    return datastore.save({"key":key, "data":boat});
}


function put_load(id, volume, carrier, item, creation_date, self){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    const load = {"id": id, "volume": volume, "carrier": carrier, "item": item, "creation_date": creation_date, "self": self};
    return datastore.save({"key":key, "data":load});
}

function put_boat(id, name, type, length, sub, loads, url){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"id": id, "name": name, "type": type, "length": length, "owner": sub, "loads": loads, "self": url};
    return datastore.save({"key": key, "data": boat});
}

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.delete(key);
}

function delete_boatload(req, boat_id, load_id){
    const boat_key = datastore.key([BOAT, parseInt(boat_id,10)]);
    return datastore.get(boat_key)
    .then( (boat) => {
        const load_key = datastore.key([LOAD, parseInt(load_id,10)]);
        datastore.get(load_key).then((load) => {
            // Remove load from boat
            var filtered = boat[0].loads.filter(loads => {
                return loads.id !== load_id;
            })
            boat[0].loads = filtered;
            datastore.save({"key":boat_key, "data":boat[0]});

            // Remove carrier from load
            load[0].carrier = null;
            datastore.save({"key":load_key, "data":load[0]});
        });
    });
}

function put_boatload(req, boat_id, load_id){
    const boat_key = datastore.key([BOAT, parseInt(boat_id,10)]);
    return datastore.get(boat_key)
    .then( (boat) => {
        if( typeof(boat[0].loads) === 'undefined'){
            boat[0].loads = [];
        }
        const load_key = datastore.key([LOAD, parseInt(load_id,10)]);
        datastore.get(load_key).then((load) => {
            // Add load to boat
            const load_url = req.protocol + "://" + req.get("host") + '/loads/' + load_id;
            const boat_load = {"id": load_id, "self": load_url}; 
            boat[0].loads.push(boat_load);
            datastore.save({"key":boat_key, "data":boat[0]});

            // Add carrier to load
            const boat_url = req.protocol + "://" + req.get("host") + '/boats/' + boat_id;
            const load_carrier = {"id": boat_id, "name": boat[0].name, "self": boat_url};
            load[0].carrier = load_carrier;
            datastore.save({"key":load_key, "data":load[0]});
        });
    });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin User Controller Functions ------------- */

router.get('/', function (req, res) {
    res.render('index', {url: BASE_URL + '/login'});
});


// Get all boats
router.get('/boats', checkJwt, function(req, res){
    get_owner_boats(req, req.user.sub)
        .then( (entities) => {
            get_owner_boats_count(req.user.sub)
                .then( (count) => {
                    const accepts = req.accepts(['application/json']);
                    if(!accepts){
                        res.status(406).json({ 'Error': 'Not acceptable'});
                    } else {
                        entities.count = count;
                        res.status(200).set("Content", "application/json").json(entities);
                    }
                })
            
        });
});

// Get a boat
router.get('/boats/:boat_id', checkJwt, function (req, res) {
    get_boat(req.params.boat_id)
        .then(boat => {
            const accepts = req.accepts(['application/json']);
            if(!accepts){
                res.status(406).json({ 'Error': 'Not acceptable'});
            } else {
                if (boat[0] === undefined || boat[0] === null) {
                    // The 0th element is undefined. This means there is no boat with this id
                    res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
                } else if (boat[0].owner !== req.user.sub) {
                    res.status(403).json({ 'Error': 'You do not own this boat' });
                } else {
                    // Return the 0th element which is the boat with this id
                    res.status(200).set("Content", "application/json").json(boat[0]);
                }
            }
        });
});

// Update a boat
router.put('/boats/:boat_id', checkJwt, function (req, res) {
    if (req.get('content-type') !== 'application/json'){
        res.status(415).json({ 'Error': 'Server only accepts application/json data'});
    } else if (req.body.name === undefined || req.body.name === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else if (req.body.type === undefined || req.body.type === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else if (req.body.length === undefined || req.body.length === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    }  else if (req.body.id !== req.params.id) {
        res.status(403).json({ 'Error': 'Updating id is not allowed' });
    } else {
        get_boat(req.params.boat_id)
            .then(boat => {
                const accepts = req.accepts(['application/json']);
                if(!accepts){
                    res.status(406).json({ 'Error': 'Not acceptable'});
                } else {
                    if (boat[0] === undefined || boat[0] === null) {
                        // The 0th element is undefined. This means there is no boat with this id
                        res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
                    } else if (boat[0].owner !== req.user.sub) {
                        res.status(403).json({ 'Error': 'You do not own this boat' });
                    } else {
                        get_boats().then(boats => {
                            if (boats.some(boat => boat.name === req.body.name)) {
                                res.status(403).json({ 'Error': 'This boat name has been used'});
                            } else {
                                put_boat(req.params.boat_id, req.body.name, req.body.type, req.body.length, boat[0].owner, boat[0].loads, boat[0].self)
                                    .then(res.status(201).set("Content", "application/json").json({ 
                                        "id": req.params.boat_id, 
                                        "name": req.body.name, 
                                        "type": req.body.type, 
                                        "length": req.body.length,
                                        "owner": boat[0].owner,
                                        "loads": boat[0].loads,
                                        "self": boat[0].self
                                    }).end());
                            };
                        });
                    }
                }
                
            });
    }
});

// Partially update a boat
router.patch('/boats/:boat_id', checkJwt, function (req, res) {
    if (req.get('content-type') !== 'application/json'){
        res.status(415).json({ 'Error': 'Server only accepts application/json data'});
    } else {
        get_boat(req.params.boat_id)
            .then(boat => {
                const accepts = req.accepts(['application/json']);
                if(!accepts){
                    res.status(406).json({ 'Error': 'Not acceptable'});
                } else {
                    if (boat[0] === undefined || boat[0] === null) {
                        // The 0th element is undefined. This means there is no boat with this id
                        res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
                    } else if (boat[0].owner !== req.user.sub) {
                        res.status(403).json({ 'Error': 'You do not own this boat' }); 
                    } else if (req.body.id !== req.params.id) {
                        res.status(403).json({ 'Error': 'Updating id is not allowed' });
                    } else {
                        if (req.body.name === undefined || req.body.name === null) {
                            var boat_name = boat[0].name;
                        } else {
                            get_boats().then(boats => {
                                if (boats.some(boat => boat.name === req.body.name)) {
                                    res.status(403).json({ 'Error': 'This boat name has been used'});
                                } else {
                                    boat_name = req.body.name;
                                }
                            })
                        };

                        if (req.body.type === undefined || req.body.type === null) {
                            var boat_type = boat[0].type;
                        } else {
                            boat_type = req.body.type;
                        };
                        if (req.body.length === undefined || req.body.length === null) {
                            var boat_length = boat[0].length;
                        } else {
                            boat_length = req.body.length;
                        };
                        put_boat(req.params.boat_id, boat_name, boat_type, boat_length, boat[0].owner, boat[0].loads, boat[0].self)
                                .then(res.status(201).set("Content", "application/json").json({ 
                                    "id": req.params.boat_id, 
                                    "name": boat_name, 
                                    "type": boat_type, 
                                    "length": boat_length,
                                    "owner": boat[0].owner,
                                    "loads": boat[0].loads,
                                    "self": boat[0].self
                                }).end());
                    }
                }
                
            });
    }

});

// Create a boat
router.post('/boats', checkJwt, function(req, res){
    if (req.body.name === undefined || req.body.name === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else if (req.body.type === undefined || req.body.type === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else if (req.body.length === undefined || req.body.length === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else {
        post_boat(req.body.name, req.body.type, req.body.length, req.user.sub)
            .then(key => {
                    const accepts = req.accepts(['application/json']);
                    if(!accepts){
                        res.status(406).json({ 'Error': 'Not acceptable'});
                    } else {
                        const url = req.protocol + "://" + req.get("host") + '/boats/' + key.id;
                        add_self(key.id, req.body.name, req.body.type, req.body.length, req.user.sub, url);
                        res.set("Content-Type", "application/json");
                        res.status(201).json({ 
                            "id": key.id, 
                            "name": req.body.name, 
                            "type": req.body.type, 
                            "length": req.body.length,
                            "owner": req.user.sub, 
                            "loads": [],
                            "self": url
                        });
                    }; 
                    
            });
    }
});


// Assign a load to a boat
router.put('/boats/:boat_id/loads/:load_id', checkJwt, function(req, res){
    get_boat(req.params.boat_id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                res.status(404).json({ 'Error': 'The specified boat and/or load does not exist' });
            } else if (boat[0].owner !== req.user.sub) {
                res.status(403).json({ 'Error': 'You do not own this boat' });
            } else {
                get_load(req.params.load_id)
                    .then(load => {
                        if (load[0] === undefined || load[0] === null) {
                            res.status(404).json({ 'Error': 'The specified boat and/or load does not exist' });
                        } else if (load[0].carrier !== null) {
                            res.status(403).json({ 'Error': 'The load is already loaded on another boat' })
                        } else {
                            put_boatload(req, req.params.boat_id, req.params.load_id)
                                .then(res.status(204).end());
                        }
                    })
            }
        })
    
});

// Remove a load from a boat
router.delete('/boats/:boat_id/loads/:load_id', checkJwt, function(req, res){
    get_boat(req.params.boat_id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                res.status(404).json({ 'Error': 'No boat with this boat_id is loaded with the load with this load_id' });
            } else if (boat[0].owner !== req.user.sub) {
                res.status(403).json({ 'Error': 'You do not own this boat' });
            } else {
                const correct_load = boat[0].loads.some(load => {
                    if (load.id === req.params.load_id) {
                        return true;
                    }
                });
                if (!correct_load) {
                    res.status(404).json({ 'Error': 'No boat with this boat_id is loaded with the load with this load_id' });
                } else {
                    get_load(req.params.load_id)
                    .then(load => {
                        if (load[0] === undefined || load[0] === null) {
                            res.status(404).json({ 'Error': 'No boat with this boat_id is loaded with the load with this load_id' });
                        } else {
                            delete_boatload(req, req.params.boat_id, req.params.load_id)
                                .then(res.status(204).end());
                        }
                    })
                }
                
            }
        })
    
});


// Delete boat
router.delete('/boats/:boat_id', checkJwt, function(req, res){
    get_boat(req.params.boat_id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                // The 0th element is undefined. This means there is no boat with this id
                res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
            } else if (boat[0].owner !== req.user.sub) {
                res.status(403).json({ 'Error': 'You do not own this boat' });
            } else {
                delete_boat(req.params.boat_id)
                    .then(get_all_loads().then(loads => {
                        loads.some(load => {
                            if (load.carrier !== null && load.carrier.id === req.params.boat_id) {
                                put_load(load.id, load.volume, null, load.item, load.creation_date, load.self);
                            }
                        });
                        res.status(204).end();
                    }));
            }
        });
});

router.use(function (err, req, res, next) {
    if (err.name === "UnauthorizedError") {
      res.status(401).json({ 'Error': 'Not authenticated' });
    } else {
      next(err);
    }
  });


/* ------------- End Controller Functions ------------- */

module.exports = router;