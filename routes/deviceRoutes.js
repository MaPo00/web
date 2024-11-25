const express = require('express');
const multer = require('multer');
const router = express.Router();
const { executeQuery } = require('./dbRoutes');

const upload = multer();

router.get('/devices/register', (req, res) => {
  res.render('register');
});

router.get('/devices', (req, res) => {
  res.render('devices');
});
router.get('/history', (req, res) => {
  res.render('history');
});


router.post('/devices/register', upload.single('image'), async (req, res) => {
  const { device_name, description, serial_number, manufacturer } = req.body;
  const image = req.file;
  const imageBuffer = image.buffer;

  if (!device_name || !description || !serial_number || !manufacturer || !imageBuffer) {
    return res.status(400).json({ message: 'Усі поля повинні бути заповнені' });
  }

  const insertQuery = `
    INSERT INTO devices (device_name, description, serial_number, manufacturer, image)
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    await executeQuery(insertQuery, [device_name, description, serial_number, manufacturer, imageBuffer]);
    res.status(201).json({ message: 'Пристрій успішно зареєстровано' });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/devices/:id/details', async (req, res) => {
  const deviceId = req.params.id;
  const selectQuery = 'SELECT * FROM devices WHERE id = ?';

  try {
    const result = await executeQuery(selectQuery, [deviceId]);
    const device = result[0];
    res.json(device);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

router.get('/devicesInfo', async (req, res) => {
  const sqlInfo = `
    SELECT d.id, d.device_name, d.serial_number, u.name AS owner_name 
    FROM devices d
    LEFT JOIN user_devices ud ON d.id = ud.device_id AND ud.returned_date IS NULL 
    LEFT JOIN users u ON ud.user_id = u.id
  `;

  try {
    const result = await executeQuery(sqlInfo);
    const devices = result;
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/devices/:id/edit', async (req, res) => {
  const deviceId = req.params.id;
  const selectQuery = 'SELECT * FROM devices WHERE id = ?';

  try {
    const result = await executeQuery(selectQuery, [deviceId]);
    const device = result[0];
    res.json({ device });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/devices/:id/edit', upload.single('file'), async (req, res) => {
  const deviceId = req.params.id;
  const { deviceName, description, serialNumber, manufacturer } = req.body;

  const updateQuery = `
    UPDATE devices
    SET device_name = ?, description = ?, serial_number = ?, manufacturer = ?
    WHERE id = ?
  `;

  const queryParams = [deviceName, description, serialNumber, manufacturer, deviceId];

  try {
    await executeQuery(updateQuery, queryParams);
    res.status(200).json({ message: 'Пристрій успішно оновлено' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/devices/:id/delete', async (req, res) => {
  const deviceId = req.params.id;
  const deleteQuery = 'DELETE FROM devices WHERE id = ?';

  try {
    await executeQuery(deleteQuery, [deviceId]);
    return res.status(200).json({ message: 'Пристрій успішно видалено' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/device/history', async (req, res) => {
  try {
    const historyQuery = `
      SELECT user_devices.user_id, users.name AS user_name, user_devices.device_id, devices.device_name, user_devices.taken_date, user_devices.returned_date
      FROM user_devices
      LEFT JOIN users ON user_devices.user_id = users.id
      LEFT JOIN devices ON user_devices.device_id = devices.id
      ORDER BY user_devices.taken_date DESC;
    `;

    const history = await executeQuery(historyQuery);
    res.json({ history });
  } catch (error) {
    console.error('Error fetching device usage history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;
