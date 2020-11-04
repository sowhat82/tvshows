//load express, handlebars, mysql2
const express = require('express')
const handlebars = require('express-handlebars')
// get the driver with promise support
const mysql = require('mysql2/promise')

// SQL 
const SQL_FIND_BY_NAME = 'select * from tv_shows where name like ? limit 20'
const SQL_GET_ALL_SHOWS = 'select * from tv_shows limit 20'
const SQL_COUNT_Q = 'select count(*) as q_count where name like ?'
const SQL_FIND_BY_TV_ID = 'select * from tv_shows where tvid = ?'

// configure PORT
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;

// create the database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: 'leisure',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 4,
    timezone: '+08:00'
})

const startApp = async (app, pool) => {

    try {
        // acquire a connection from the connection pool
        const conn = await pool.getConnection();

        console.info('Pinging database...')
        await conn.ping()

        // release the connection
        conn.release()

        // start the server
        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`)
        })

    } catch(e) {
        console.error('Cannot ping database: ', e)
    }
}

// create an instance of application
const app = express()

// configure handlebars
app.engine('hbs', handlebars({ defaultLayout: 'default.hbs' }))
app.set('view engine', 'hbs')

// configure the application
app.get('/', async (req, resp) => {

    const conn = await pool.getConnection()

    // to sort the array of show names by descending order
    function compare( a, b ) {
        if ( a.name < b.name ){
          return 1;
        }
        if ( a.name > b.name ){
          return -1;
        }
        return 0;
      }

    try {
        const results = await conn.query(SQL_GET_ALL_SHOWS)
        const shownames = results[0]
        .map( d => {
                return {name: d.name, tvid: d.tvid}
            }
        )
        shownames.sort(compare )
        resp.status(200)
        resp.type('text/html')
        resp.render('index', { shows: shownames})

    } catch(e) {
        resp.status(500)
        resp.type('text/html')
        resp.send(JSON.stringify(e))
    } finally {
        conn.release()
    }
})

app.get('/search', 
    async (req, resp) => {
        const q = req.query['q'];
//        const offset = parseInt(req.query['offset']) || 0
//        const limit = 10

        // acquire a connection from the pool
        let conn, recs;

        try {
            conn = await pool.getConnection()


            // perform the query
            //  select * from apps where name like ? limit ?
            result = await conn.query(SQL_FIND_BY_NAME, [ `%${q}%`])
            recs = result[0];

        } catch(e) {
			  resp.status(500)
			  resp.type('text/html')
			  resp.send('<h2>Error</h2>' + e)
        } finally {
            // release connection
            if (conn)
                conn.release()
        }

        resp.status(200)
        resp.type('text/html')
        resp.render('results', 
            { 
                result: recs, 
                hasResult: recs.length > 0,
                q: q,
            }
        )
    }
)

app.get('/show/:tvid', async (req, resp) => {
    const tvid = req.params['tvid']

    const conn = await pool.getConnection()

    try {
        const results = await conn.query(SQL_FIND_BY_TV_ID, [ tvid ])
        const recs = results[0]

        if (recs.length <= 0) {
            //404!
            resp.status(404)
            resp.type('text/html')
            resp.send(`Not found: ${tvid}`)
            return
        }

        resp.status(200)
        resp.format({
            'text/html': () => {
                resp.type('text/html')
                resp.render('show', { show: recs[0] })
            },
            'application/json': () => {
                resp.type('application/json')
                resp.json(recs[0])
            },
            'default': () => {
                resp.type('text/plain')
                resp.send(JSON.stringify(recs[0]))
            }
        })

    } catch(e) {
        resp.status(500)
        resp.type('text/html')
        resp.send(JSON.stringify(e))
    } finally {
        conn.release()
    }
})

startApp(app, pool)