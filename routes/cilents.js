const express = require('express')
const route = express.Router()
const mysql = require('mysql')
const cors = require('cors')
const auth = require('../middlewares/auth')
route.use(cors())
const connection = mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database,
})

connection.connect()

route.get('/getAll', auth, (req, res) => {
  if (req.role !== 'admin' && req.role !== 'vendeur') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }
  var query = connection.query(
    'SELECT * FROM clients where statue = 1 ',
    function (error, results, fields) {
      if (error) throw error
      results = results.map((r) => ({
        id: r.id_client,
        nom: r.nom,
        tel: r.tel_client,
        status: r.statue,
      }))
      res.json({ status: 'ok', data: results })
    }
  )
})

route.get('/getClient/:id', auth, (req, res) => {
  if (req.role !== 'admin') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }
  const id = parseInt(req.params.id)
  var query = connection.query(
    'SELECT * FROM clients WHERE id_client = ?',
    [id],
    function (error, results, fields) {
      if (error) throw error

      res.json({ status: 'ok', data: results[0] })
    }
  )
})

route.post('/add', auth, (req, res) => {
  const { nom, tel } = req.body
  if (req.role !== 'admin' && req.role !== 'vendeur') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }
  var query = connection.query(
    'INSERT INTO clients values (?,?,?,?) ',
    [null, nom, tel, 1],
    function (error, results, fields) {
      if (error) throw error
      if (results.affectedRows > 0) {
        res.json({ status: 'ok', data: 'client ajouté avec succés' })
      } else {
        res.json({ status: 'ko', data: 'client non ajouté' })
      }
    }
  )
})
route.put('/modify/:id', auth, (req, res) => {
  if (req.role !== 'admin') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }
  const id = parseInt(req.params.id)
  const { nom, tel } = req.body

  var query = connection.query(
    'UPDATE clients SET nom = ? ,  tel_client = ? WHERE id_client= ?',
    [nom, tel, id],
    function (error, results, fields) {
      if (error) throw error
      if (results.affectedRows > 0) {
        res.json({ status: 'ok', data: 'client modifié avec succés' })
      } else {
        res.json({ status: 'ko', data: 'modification errone' })
      }
    }
  )
})

route.delete('/delete/:id', auth, (req, res) => {
  const id = parseInt(req.params.id)
  if (req.role !== 'admin') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }

  var query = connection.query(
    'UPDATE clients SET statue = ? WHERE id_client =?  ',
    [0, id],
    function (error, results, fields) {
      if (error) throw error

      if (results.affectedRows <= 0) {
        return res.json({ status: 'ko', data: 'clients non trouve' })
      }

      res.json({
        status: 'ok',
        data: 'clients supprier ave succes',
      })
    }
  )
})

module.exports = route
