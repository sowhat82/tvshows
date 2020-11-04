//load express, handlebars, mysql2
const express = require('express')
const handlebars = require('express-handlebars')
// get the driver with promise support
const mysql = require('mysql2/promise')

//const r = require('./tvrouter')

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

const tvrouter = require('./tvshows')(pool, '/tvshows')  

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

app.use('/tvshows', tvrouter)

startApp(app, pool)