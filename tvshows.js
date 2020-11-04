const express = require('express')

const SQL_FIND_BY_NAME = 'select * from tv_shows where name like ? limit 20'
const SQL_GET_ALL_SHOWS = 'select * from tv_shows limit 20'
const SQL_COUNT_Q = 'select count(*) as q_count where name like ?'
const SQL_FIND_BY_TV_ID = 'select * from tv_shows where tvid = ?'

module.exports = function(p, r){
    const router = express.Router()
    const pool = p
    const root = r || '/'

    router.get('/', async (req, resp) => {

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
            resp.render('index', { shows: shownames, root})
    
        } catch(e) {
            resp.status(500)
            resp.type('text/html')
            resp.send(JSON.stringify(e))
        } finally {
            conn.release()
        }
    })

    router.get('/:tvid', async (req, resp) => {
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

    return (router)
}