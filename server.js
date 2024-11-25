const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');


const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(express.static('public'));

app.use(cookieParser());

const YAML = require('yaml')

const file = fs.readFileSync('./openapi.yaml', 'utf8')
const swaggerDocument = YAML.parse(file)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));




app.use((req, res, next) => {
  const id = req.cookies.id;
  const name = req.cookies.name;
  res.locals.id = id;
  res.locals.name = name;
  next();
});

const userRoutes = require('./routes/userRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

app.use('/', userRoutes);
app.use('/', deviceRoutes);

app.use('/', (req, res) => {
  res.render('headers', { id: res.locals.id, name: res.locals.name });
});


app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});

