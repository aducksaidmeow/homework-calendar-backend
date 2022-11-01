const router = require('express').Router();
const { google } = require('googleapis');

// google oauth client
const GOOGLE_CLIENT_ID = '751663766420-54n8kdogn61k73lv5e40k9jbrjk80eeh.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  'http://localhost:3000'
)

// firebase admin
var admin = require('firebase-admin');
var serviceAccount = require("./digital-bonfire-363805-firebase-adminsdk-tfo0m-f7a44aba3f.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://digital-bonfire-363805-default-rtdb.firebaseio.com'
});

router.get('/', async (req, res, next) => {
  res.send({ message: 'Ok api is working 🚀' });
});

router.post('/create-tokens', async(req, res, next) => {
  try {
    
    const { code } = req.body;
    const { tokens } = await oauth2Client.getToken(code);
    res.send(tokens);

  } catch(error) {
    next(error);
  }
});

router.post('/add-email', async(req, res, next) => {
  try {
    const { fullEmail, email } = req.body;
    //localStorage.setItem('fullEmail', fullEmail);
    //localStorage.setItem('email', email);
    res.send({ message: "email added successfully" });
  } catch(error) {
    next(error);
  }
});

router.post('/add-no-role', async(req, res, next) => {
  try {

    const { userId, refresh_token } = req.body;
    const db = admin.database();
    const ref = db.ref(userId + '/');
    ref.update({ 
      refresh_token : refresh_token 
    });

    res.send({ message : "no-role added success" });

  } catch(error) {
    next(error);
  }
});

router.post('/add-role', async(req, res, next) => {
  try {

    const { userId, role } = req.body;

    const db = admin.database();
    const ref = db.ref(userId + '/');
    ref.update({ role: role });

    res.send({ message: "Role added successfully" });

  } catch(error) {
    next(error);
  }
});

router.post('/get-role', async(req, res, next) => {
  try {
    const { userId } = req.body;
    const db = admin.database();
    const ref = db.ref(userId + '/role/');
    const role = (await ref.once('value')).val();
    res.send(role);
  } catch(error) {
    next(error);
  }
});

router.post('/add-acl', async(req, res, next) => {
  try {
    const { userId } = req.body;

    const db = admin.database();
    const ref = db.ref(userId + '/');
    const refresh_token = (await ref.once('value')).val().refresh_token;
    oauth2Client.setCredentials({ refresh_token : refresh_token });
    
    const calendar = google.calendar('v3');
    const response = await calendar.acl.insert({
      auth: oauth2Client,
      calendarId: 'primary',
      requestBody: {
        role: 'reader',
        scope: {
          type: 'default',
        }
      }
    });

    res.send({ message: 'acl added successfully' });

  } catch(error) {
    next(error);
  }
});

router.post('/add-group', async(req, res, next) => {
  try {
    const { userId, groupName, groupMember } = req.body;
    const db = admin.database();
    const ref = db.ref(userId + '/groups/');
    ref.update({ [groupName] : groupMember });
    res.send({ message: "Group added"});
  } catch(error) {
    next(error);
  }
});

router.post('/get-group', async(req, res, next) => {
  try {
    const { userId } = req.body;
    const db = admin.database();
    const ref = db.ref(userId + '/groups/');
    const groups = (await ref.once('value')).val();
    res.send(groups);
  } catch(error) {
    next(error);
  }
});

router.post('/add-event', async(req, res, next) => {
  try {
    const { userId, title, description, group, startDatetime, endDatetime } = req.body;

    const db = admin.database();
    const groupRef = db.ref(userId + '/groups/' + group + '/');
    const groupMember = (await groupRef.once('value')).val();

    const groupMemberObj = [];
    groupMember.map((item, index) => {
      groupMemberObj.push({ email: item });
    });

    const tokenRef = db.ref(userId + '/');
    const refresh_token = (await tokenRef.once('value')).val().refresh_token;
    oauth2Client.setCredentials({ refresh_token : refresh_token });

    const calendar = google.calendar('v3');
    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: description,
        start: {
          dateTime: new Date(startDatetime),
        },
        end: {
          dateTime: new Date(endDatetime),
        },
        attendees: groupMemberObj,
      }
    })

    res.send(response);

  } catch(error) {
    next(error);
  }
});

module.exports = router;