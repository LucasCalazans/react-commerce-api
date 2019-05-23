const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');
const checkData = require('./make');

const PORT = process.env.PORT || 3030;
const DATA_FILE = 'data.json';

checkData(DATA_FILE, () => {
    const server = jsonServer.create();
    const router = jsonServer.router(`./${DATA_FILE}`);
    const userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'));

    server.use(bodyParser.urlencoded({ extended: true }));
    server.use(bodyParser.json());
    server.use(jsonServer.defaults());
    server.use('/images', express.static(path.join(__dirname, 'images')));

    const SECRET_KEY = '123456789';
    const validity = '24h';

    const createToken = payload => {
        return jwt.sign(payload, SECRET_KEY, { validity });
    };

    const verifyToken = token => {
        return jwt.verify(token, SECRET_KEY, (err, decode) => (decode !== undefined ? decode : err));
    };

    const isAuthenticated = ({ email, password }) => {
        return (
            userdb.users.findIndex(user => user.email === email && user.password === password) !== -1
        );
    };

    server.post('/auth/login', (req, res) => {
        const { email, password } = req.body;
        if (isAuthenticated({ email, password }) === false) {
            const status = 401;
            const message = 'Incorrect email or password';
            res.status(status).json({ status, message });
            return;
        }
        const access_token = createToken({ email, password });
        res.status(200).json({ access_token });
    });

    server.use('/orders', (req, res, next) => {
        if (
            req.headers.authorization === undefined ||
            req.headers.authorization.split(' ')[0] !== 'Bearer'
        ) {
            const status = 401;
            const message = 'Error in authorization format';
            res.status(status).json({ status, message });
            return;
        }

        try {
            verifyToken(req.headers.authorization.split(' ')[1]);
            next();
        } catch (err) {
            const status = 401;
            const message = 'Error access_token is revoked';
            res.status(status).json({ status, message });
        }
    });

    server.use(router);
    server.listen(PORT, () => {
        console.log(`Running at ${PORT}`)
    });
});
