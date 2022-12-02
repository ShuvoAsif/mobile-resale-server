const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
        const bookingCollection = client.db('mobileResale').collection('booking');
        const paymentsCollection = client.db('mobileResale').collection('payments');


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

        app.get('/reporteditems', async (req, res) => {
            const query = {};
            const mobiles = await mobileCollection.find(query).toArray();
            const reportedMobiles = mobiles.filter(n => n.reported === true);
            res.send(reportedMobiles);

        });

        app.get('/mobiles', async (req, res) => {
            const query = {};
            const mobiles = await mobileCollection.find(query).toArray();
            res.send(mobiles);
        });

        app.get('/advertisemobiles', async (req, res) => {
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

        app.get('/booking', async (req, res) => {
            const query = {};
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.post('/booking', async (req, res) => {
            const bookitem = req.body;
            console.log(bookitem);
            const result = await bookingCollection.insertOne(bookitem);
            res.send(result);
        });

        app.post('/addmobiles', async (req, res) => {
            const mobile = req.body;
            console.log(mobile);
            const result = await mobileCollection.insertOne(mobile);
            res.send(result);
        });


        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });



        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await paymentsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })


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


        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { productid: id };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })

        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        app.delete('/mobile/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await mobileCollection.deleteOne(query);
            res.send(result);
        })

        app.delete('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })

        app.delete('/myproduct/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await mobileCollection.deleteOne(query);
            res.send(result);
        })

        app.delete('/reportedproduct/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await mobileCollection.deleteOne(query);
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

        app.put('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    reported: true
                }
            }
            const result = await mobileCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.put('/mobiles/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    is_add: true
                }
            }
            const result = await mobileCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.put('/mobilesold/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    is_sold: true
                }
            }
            const result = await mobileCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.put('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { productid: id }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isPaid: true
                }
            }
            const result = await bookingCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });




        app.get('/userinfo', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const userinfo = await usersCollection.findOne(query);
            res.send(userinfo);
        });

        app.get('/myproducts', async (req, res) => {
            const email = req.query.email;
            const query = { seller_mail: email };
            const mobiles = await mobileCollection.find(query).toArray();
            res.send(mobiles);
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