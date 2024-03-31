const mysql = require('mysql2');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const { profile } = require('console');
const io = new Server(server);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'your_database'
});
connection.connect();
connection.query('CREATE TABLE IF NOT EXISTS last_user (mail varchar(50),blog_time datetime);', (err, result) => {
  try {
    if (err) throw err
    console.log("last_user created")
  } catch {
    console.log(err)
  }
})
app.get('/', (req, res) => {
  let query = 'CREATE TABLE IF NOT EXISTS blogs (email VARCHAR(55) ,blog text,time datetime);'
  connection.query(query, (err, res) => {
    try {
      if (err) throw err;
      console.log('Table blog created')
    } catch {
      console.log('Error creating table')
    }
  })
  res.render('loginpage', { warning: "" });
});
app.get('/signup', (req, res) => {
  res.render('signup', { warning: "" })
})
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
let logedinmail = "notloged";

app.post('/', (req, res) => {
  const { email, password } = req.body;
  logedinmail = email
  connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      throw err;
    }
    if (results.length === 0) {
      res.render('loginpage', { warning: 'Email not found' });
    } else {
      const user = results[0];
      if (user.password !== password) {
        res.render('loginpage', { warning: 'Incorrect email or password' });
      } else {
        connection.query("select name,email from users inner join last_user on last_user.mail = users.email where last_user.mail != '" + email + "' order by  last_user.blog_time desc;", (err, result) => {
          try {
            if (err) throw err;
            res.render('mainpage', { mail : email,users: result })
          } catch {
            res.send("db error")
          }
        })
      }
    }
  });
});
app.post('/signup', (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  connection.query('insert into last_user values (?,"2024-03-24 00:00:00")', [email], (err, result) => {
    try {
      if (err) throw err
    } catch {
      console.log(err)
    }
  })
  connection.connect((err) => {
    connection.query("CREATE TABLE IF NOT EXISTS users (name VARCHAR(25),email VARCHAR(55) PRIMARY KEY,password VARCHAR(20));", (err, result) => {
      if (err) throw err
      else {
        console.log("done")
      }
    })
    connection.query('SELECT * FROM users WHERE email = "' + email + '";', (err, results) => {
      if (err) {
        throw err;
      }

      if (results.length > 0) {
        // Email already exists
        res.render('signup', { warning: "email aready in use" });
      } else {
        const qur = "insert into users  values ('" + name + "','" + email + "','" + password + "')";
        connection.query(qur, (err, result, field) => {
          try {
            if (err) throw err
            res.render('loginpage', { warning: "" })
          } catch {
            res.send('databse problem')
          }
        })
      }
    });
  });
})
app.get('/profile/:mail', (req, res) => {
  let blogs;
  let mail = req.params.mail
  connection.query("select blog,DATE_FORMAT(time, '%H:%i:%s') AS time, DATE_FORMAT(time, '%Y-%m-%d') AS date from blogs where email = '"+mail+"' order by date desc,time desc;", (err, result) => {
    try {
      if (err) throw err
      blogs = result
    } catch {
      console.log(err)
    }
  })
  connection.query("select name , email from users where email = '" + mail + "';", (err, results) => {
    try {
      if (err) throw err
      res.render('profile', { name: results[0].name, mail: results[0].email, blogs: blogs })
    } catch {
      res.render('loginpage', { warning: "" })
    }
  })
});
app.post('/profile/:mail', (req, res) => {
  let name = req.body.name;
  let email = req.body.email;
  let title = req.body.title;
  let newblog = req.body.blog;
  newblog = title + " :-  " + newblog;

  let query = `insert into blogs values (?,?,now());`
  if (newblog != "") {
    connection.query(query, [email, newblog], (err, result) => {
      try {
        if (err) throw err
        console.log('blog added')
      } catch {
        console.log(err)
      }
    });
    newblog = ""
  }

  connection.query('UPDATE last_user SET blog_time = NOW() WHERE mail = ?;', [email], (err, result) => {
    try {
      if (err) throw err
    } catch {
      console.log(err)
    }
  })
  res.redirect(`/success/${email}`);
})
app.get('/success/:mail', (req, res) => {
  let blogs;
  let mail = req.params.mail
  connection.query("select blog,DATE_FORMAT(time, '%H:%i:%s') AS time, DATE_FORMAT(time, '%Y-%m-%d') AS date from blogs where email = '" + mail + "' order by date desc ,time desc;", (err, result) => {
    try {
      if (err) throw err
      blogs = result
    } catch {
      console.log(err)
    }
  })
  connection.query("select name , email from users where email = '" + mail + "';", (err, results) => {
    try {
      if (err) throw err
      res.render('profile', { name: results[0].name, mail: results[0].email, blogs: blogs })
    } catch {
      res.render('loginpage', { warning: "" })
    }
  })
});
app.get('/profile/:mail/:name', (req, res) => {
  let name = req.params.name;
  let mail = req.params.mail
  connection.query("select blog,DATE_FORMAT(time, '%H:%i:%s') AS time, DATE_FORMAT(time, '%Y-%m-%d') AS date from blogs where email = '" + mail + "' order by date desc,time desc;", (err, result) => {
    try {
      if (err) throw err
      res.render('friendsblog', { name: name, blogs: result })
    } catch {
      res.send("database problem ");
    }
  })
})
app.get('/mainpage/:mail',(req,res) => {
  if(logedinmail != "notloged"){
    connection.query("select name,email from users inner join last_user on last_user.mail = users.email where last_user.mail != '" + req.params.mail + "' order by  last_user.blog_time desc;", (err, result) => {
      try {
        if (err) throw err;
        res.render('mainpage', {mail:req.params.mail, users: result })
      } catch {
        res.send("db error")
      }
    })
  }else{
    res.send('<h1>404 - notlogein</h1>')
  }
})
app.get('/logout/:mail',(req,res) => {
  logedinmail = "notloged"
  res.render('loginpage', { warning: "" })
})