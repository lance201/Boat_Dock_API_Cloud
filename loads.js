const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const ds = require('./datastore');

const datastore = ds.datastore;

const LOAD = "Load";
const BOAT = "Boat";

router.use(bodyParser.json());


/* ------------- Begin load Model Functions ------------- */
function post_load(volume, item, create_date){
    var key = datastore.key(LOAD);
	const new_load = {"volume": volume, "item": item, "create_date": create_date};
	return datastore.save({"key":key, "data":new_load}).then(() => {return key});
}

function add_self(id, volume, item, create_date, url){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    const load = {"volume": volume, "carrier": null, "item": item, "create_date": create_date, "self": url};
    return datastore.save({"key":key, "data":load});
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

function get_all_loads(req){
    var q = datastore.createQuery(LOAD).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.loads = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "/loads" + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}

function get_all_loads_count(){
    var q = datastore.createQuery(LOAD);
	return datastore.runQuery(q).then( (entities) => {
        results = entities[0].map(ds.fromDatastore).length;
        return results;
	});
}

function put_boat(id, name, type, length, sub, loads, url){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"id": id, "name": name, "type": type, "length": length, "owner": sub, "loads": loads, "self": url};
    return datastore.save({"key": key, "data": boat});
}

function put_load(id, volume, item, create_date, carrier, url){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    const load = {"id": id, "volume": volume, "item": item, "create_date": create_date, "carrier": carrier, "self": url};
    return datastore.save({"key": key, "data": load});
}

function delete_load(id){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    return datastore.delete(key);
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

// Get all loads
router.get('/', function(req, res){
    get_all_loads(req)
        .then( (loads) => {
            get_all_loads_count()
            .then( (count) => {
                const accepts = req.accepts(['application/json']);
                if(!accepts){
                    res.status(406).json({ 'Error': 'Not acceptable'});
                } else {
                    loads.count = count;
                    res.status(200).set("Content", "application/json").json(loads);
                }
            })
        });
});

// Get a load
router.get('/:load_id', function (req, res) {
    get_load(req.params.load_id)
        .then(load => {
            const accepts = req.accepts(['application/json']);
            if(!accepts){
                res.status(406).json({ 'Error': 'Not acceptable'});
            } else {
                if (load[0] === undefined || load[0] === null) {
                    // The 0th element is undefined. This means there is no load with this id
                    res.status(404).json({ 'Error': 'No load with this load_id exists' });
                } else {
                    // Return the 0th element which is the load with this id
                    res.status(200).set("Content", "application/json").json(load[0]);
                }
            }
        });
});

// Update a load
router.put('/:load_id', function (req, res) {
    if (req.get('content-type') !== 'application/json'){
        res.status(415).json({ 'Error': 'Server only accepts application/json data'});
    } else if (req.body.volume === undefined || req.body.volume === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else if (req.body.item === undefined || req.body.item === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else if (req.body.create_date === undefined || req.body.create_date === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    }  else if (req.body.id !== req.params.id) {
        res.status(403).json({ 'Error': 'Updating id is not allowed' });
    } else {
        get_load(req.params.load_id)
            .then(load => {
                const accepts = req.accepts(['application/json']);
                if(!accepts){
                    res.status(406).json({ 'Error': 'Not acceptable'});
                } else {
                    if (load[0] === undefined || load[0] === null) {
                        // The 0th element is undefined. This means there is no boat with this id
                        res.status(404).json({ 'Error': 'No load with this load_id exists' });
                    } else {
                        put_load(req.params.load_id, req.body.volume, req.body.item, req.body.create_date, load[0].carrier, load[0].self)
                            .then(res.status(201).set("Content", "application/json").json({ 
                                "id": req.params.load_id, 
                                "volume": req.body.volume, 
                                "item": req.body.item, 
                                "create_date": req.body.create_date,
                                "carrier": load[0].carrier,
                                "self": load[0].self
                            }).end());
                    }
                }
                
            });
    }
});

// Partially update a load
router.patch('/:load_id', function (req, res) {
    if (req.get('content-type') !== 'application/json'){
        res.status(415).json({ 'Error': 'Server only accepts application/json data'});
    } else {
        get_load(req.params.load_id)
            .then(load => {
                const accepts = req.accepts(['application/json']);
                if(!accepts){
                    res.status(406).json({ 'Error': 'Not acceptable'});
                } else {
                    if (load[0] === undefined || load[0] === null) {
                        // The 0th element is undefined. This means there is no boat with this id
                        res.status(404).json({ 'Error': 'No load with this load_id exists' }); 
                    } else if (req.body.id !== req.params.id) {
                        res.status(403).json({ 'Error': 'Updating id is not allowed' });
                    } else {
                        if (req.body.volume === undefined || req.body.volume === null) {
                            var load_volume = load[0].volume;
                        } else {
                            load_volume = req.body.volume;
                        };

                        if (req.body.item === undefined || req.body.item === null) {
                            var load_item = load[0].item;
                        } else {
                            load_item = req.body.item;
                        };
                        if (req.body.create_date === undefined || req.body.create_date === null) {
                            var load_create_date = load[0].create_date;
                        } else {
                            load_create_date = req.body.create_date;
                        };
                        put_load(req.params.load_id, load_volume, load_item, load_create_date, load[0].carrier, load[0].self)
                            .then(res.status(201).set("Content", "application/json").json({ 
                                "id": req.params.load_id, 
                                "volume": load_volume, 
                                "item": load_item, 
                                "create_date": load_create_date,
                                "carrier": load[0].carrier,
                                "self": load[0].self
                            }).end());
                    }
                }
                
            });
    }

});


// Create a load
router.post('/', function(req, res){
    if (req.body.volume === undefined || req.body.volume === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else if (req.body.item === undefined || req.body.item === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else if (req.body.create_date === undefined || req.body.create_date === null) {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes' });
    } else {
        post_load(req.body.volume, req.body.item, req.body.create_date)
            .then(key => {
                    const accepts = req.accepts(['application/json']);
                    if(!accepts){
                        res.status(406).json({ 'Error': 'Not acceptable'});
                    } else {
                        const url = req.protocol + "://" + req.get("host") + '/loads/' + key.id;
                        add_self(key.id, req.body.volume, req.body.item, req.body.create_date, url);
                        res.status(201).json({ 
                            "id": key.id, 
                            "volume": req.body.volume, 
                            "item": req.body.item, 
                            "create_date": req.body.create_date, 
                            "carrier": null,
                            "self": url
                        });
                    }
            });
    }
});


// Delete a load
router.delete('/:load_id', function(req, res){
    get_load(req.params.load_id)
        .then(load => {
            if (load[0] === undefined || load[0] === null) {
                // The 0th element is undefined. This means there is no load with this id
                res.status(404).json({ 'Error': 'No load with this load_id exists' });
            } else {
                if (load[0].carrier !== null) {
                    get_boat(load[0].carrier.id).then(boat => {
                        var filtered = boat[0].loads.filter(load => {
                            return load.id !== req.params.load_id;
                        })
                        put_boat(boat[0].id, boat[0].name, boat[0].type, boat[0].length, filtered, boat[0].self);
                    });
                };
                delete_load(req.params.load_id).then(res.status(204).end());
            }
        });
});

/* ------------- End Controller Functions ------------- */

module.exports = router;