const express = require('express')
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000;
var jwt = require('jsonwebtoken');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middleware
app.use(express.json())
app.use(cors())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ze0g6j8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'Invalid authorization'});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'Invalid authorization'});
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const services = client.db('carDoctor').collection('services');
    const bookings = client.db('carDoctor').collection('bookings');
    app.get('/services', async(req, res) => {
        const result = await services.find().toArray();
        res.send(result);
    })
    app.get('/service/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const option = {
        projection: {img:1, title:1, service_id:1, price:1 }
      }
      const result = await services.findOne(query, option);
      res.send(result);
    })
    app.post('/bookings', async(req, res) => {
      const bookInfo = req.body;
      const result = await bookings.insertOne(bookInfo);
      res.send(result);
    })
    // jwt
    app.post('/jwt', (req, res) => {
      const token = jwt.sign(req.body, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'});
      res.send({token})
    })
    app.get('/all-bookings', verifyJWT, async(req, res) => {
      const decoded = req.decoded;
      if(decoded.email !== req.query.email){
        return res.status(403).send({error: true, message: 'forbidden access'});
      }
      let query = {};
      if(req.query?.email){ 
        query = {email: req.query.email}
      }
      const result = await bookings.find(query).toArray();
      res.send(result);
    })
    app.delete(`/all-bookings/:id`, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await bookings.deleteOne(query);
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(5000, () => {
  console.log(`Example app listening on port 5000! ${port}`)
})