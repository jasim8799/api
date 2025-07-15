require('dotenv').config();
const mongoose = require('mongoose');

// Define your schema
const appVersionSchema = new mongoose.Schema({
  version: String,
  changelog: String,
  mandatory: Boolean,
  platform: String,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const AppVersion = mongoose.model('AppVersion', appVersionSchema);

// connect
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('✅ Connected to MongoDB!');

    // Check if version already exists
    const exists = await AppVersion.findOne({
      version: '1.0.3',
      platform: 'android',
    });

    if (exists) {
      console.log('Version already exists, skipping insert.');
    } else {
      await AppVersion.create({
        version: '1.0.3',
        changelog: 'Added search feature and bug fixes',
        mandatory: false,
        platform: 'android',
      });

      console.log('✅ Seeded app version!');
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
