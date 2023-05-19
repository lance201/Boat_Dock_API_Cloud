const router = module.exports = require('express').Router();

router.use('/', require('./boats'));
router.use('/loads', require('./loads'));
