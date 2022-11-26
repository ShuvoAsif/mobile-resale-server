const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.de46jr0.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {

    try {
        const mobileCollection = client.db('mobileResale').collection('mobiles');
        const categoryCollection = client.db('mobileResale').collection('categories');

        app.get('/catmobiles/:id', async (req, res) => {
            const id = req.params.id;
            const query = {};
            const mobiles = await mobileCollection.find(query).toArray();
            const selectedMobiles = mobiles.filter(n => n.category_id === id);
            res.send(selectedMobiles);

        });

        app.get('/mobiles', async (req, res) => {
            const query = {};
            const mobiles = await mobileCollection.find(query).toArray();
            res.send(mobiles);

        });


        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoryCollection.find(query).toArray();
            res.send(categories);
        })

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