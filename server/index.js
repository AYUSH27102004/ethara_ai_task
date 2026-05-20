require('dotenv').config();
const prisma = require('./prisma');
const app = require('./app');

const PORT = process.env.PORT || 5000;

prisma.$connect()
  .then(() => {
    console.log('Connected to Database');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error(err));
