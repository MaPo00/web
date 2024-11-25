const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const {db, executeQuery} = require('./dbRoutes');

const upload = multer()

router.get('/logout', (req, res) => {
    res.clearCookie('name');
    res.clearCookie('id');
    res.redirect('/login');
  });

router.get('/user/register', upload.none() ,(req, res) => {
  res.render('usersRegistration', {error: ''});
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/user', (req, res)=>{
  res.render('user');
})


router.post('/user/register', upload.none(), async (req, res) => {
    const { email, name, password } = req.body;
    try {
        const existingUser = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Користувач уже зареєстрований за цією поштою' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await executeQuery(
            'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
            [email, name, hashedPassword]
        );
        
        const userId = result.insertId;

        res.cookie('name', name, { httpOnly: true, path: '/' });
        res.cookie('id', userId, { httpOnly: true, path: '/' });
        res.status(201).json({ message: 'Користувач успішно зареєстрований', userId });

       
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/users/login', upload.none(), async (req, res) => {
  const { email, password } = req.body;
  try {
    const getUserQuery = `
      SELECT * FROM users
      WHERE email = ?
    `;

    const result = await executeQuery(getUserQuery, [email]);
    const user = result[0];

    if (!user) {
      return res.status(401).json({ error: 'Неправильні дані' });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Неправильні дані' });
    }

    res.cookie('name', user.name, { httpOnly: true, path: "/" });
    res.cookie('id', user.id, { httpOnly: true, path: "/" });
    res.redirect(`/user`);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/userInfo', async (req, res) => {
  try {
    const userId = req.cookies.id;
    const username = req.cookies.name;

    const availableDevicesQuery = `
      SELECT d.* FROM devices d
      LEFT JOIN (
        SELECT device_id, MAX(taken_date) AS max_taken_date
        FROM user_devices
        GROUP BY device_id
      ) ud_latest ON d.id = ud_latest.device_id
      LEFT JOIN user_devices ud ON d.id = ud.device_id AND ud_latest.max_taken_date = ud.taken_date
      WHERE ud.returned_date IS NOT NULL OR ud.device_id IS NULL
    `;

    const inUseDevicesQuery = `
      SELECT d.* FROM devices d
      JOIN user_devices ud ON d.id = ud.device_id
      WHERE ud.returned_date IS NULL AND ud.user_id = ?
    `;

    const [availableDevices, inUseDevices] = await Promise.all([
      executeQuery(availableDevicesQuery, [userId]),
      executeQuery(inUseDevicesQuery, [userId]),
    ]);

    res.status(200).json({ name: username, id: userId, devices: availableDevices, inUseDevices: inUseDevices });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

router.post('/user/devices/take', (req, res) => {
  const userId = req.cookies.id;
  const deviceId = req.body.deviceId;

  const insertQuery = `
    INSERT INTO user_devices (user_id, device_id, taken_date)
    VALUES (?, ?, NOW())
  `;

  db.query(insertQuery, [userId, deviceId], (err, result) => {
    if (err) {
      return  res.status(500).json({ error: 'Internal Server Error' });
    } 
    res.redirect('/user');
  });
});

router.put('/user/devices/return', (req, res) => {
  const userId = req.cookies.id;
  const deviceId = req.body.deviceId;

  const updateQuery = `
    UPDATE user_devices
    SET returned_date = NOW()
    WHERE user_id = ? AND device_id = ? AND returned_date IS NULL
  `;

  db.query(updateQuery, [userId, deviceId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    } 
    res.status(200).redirect('/user');
  });
});

module.exports = router;
