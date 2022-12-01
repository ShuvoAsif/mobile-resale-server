const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.de46jr0.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}



async function run() {

    try {
        const mobileCollection = client.db('mobileResale').collection('mobiles');
        const categoryCollection = client.db('mobileResale').collection('categories');
        const usersCollection = client.db('mobileResale').collection('users');


        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }



        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });


        app.get('/catmobiles/:id', async (req, res) => {
            const id = req.params.id;
            const query = {};
            const mobiles = await mobileCollection.find(query).toArray();
            const selectedMobiles = mobiles.filter(n => n.category_id === id && n.is_sold === false);
            res.send(selectedMobiles);

        });

        app.get('/mobiles', async (req, res) => {
            const query = {};
            const mobiles = await mobileCollection.find(query).toArray();
            res.send(mobiles);
        });

        app.get('/addmobiles', async (req, res) => {
            const query = {};
            const mobiles = await mobileCollection.find(query).toArray();
            const addvertiseMobiles = mobiles.filter(n => n.is_add === true && n.is_sold === false);
            res.send(addvertiseMobiles);

        });


        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoryCollection.find(query).toArray();
            res.send(categories);
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.post('/addmobiles', async (req, res) => {
            const mobile = req.body;
            console.log(mobile);
            const result = await mobileCollection.insertOne(mobile);
            res.send(result);
        });



        app.get('/buyers', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            const buyers = users.filter(n => n.role === "buyer");
            res.send(buyers);
        });

        app.get('/sellers', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            const sellers = users.filter(n => n.role === "seller");
            res.send(sellers);
        });



        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })


        app.put('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verify: true
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });




        app.get('/userinfo', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const userinfo = await usersCollection.findOne(query);
            res.send(userinfo);
        });


    }
    finally {

    }
}
run().catch(err => console.error(err));




app.get('/', (req, res) => {
    res.send('mobile resale server is running')
})

app.listen(port, () => {
    console.log(`mobile resale server running on ${port}`);
})