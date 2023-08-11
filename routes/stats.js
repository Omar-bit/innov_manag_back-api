const express = require('express')
const route = express.Router()
const mysql = require('mysql')
const cors = require('cors')
const auth = require('../middlewares/auth')
const fileUpload = require('express-fileupload')
const path = require('path')
route.use(cors())
route.use(fileUpload())
route.use('../uploads', express.static('uploads'))
route.use(express.json())
const connection = mysql.createConnection({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database,
})

connection.connect()

route.get('/getCap', auth, (req, res) => {
  if (req.role !== 'admin' && req.role !== 'comptable') {
    return res.json({
      status: 'ko',
      data: "vous n'avez pas le droit d'accès",
    })
  }
  var query = connection.query(
    'SELECT SUM(qte*prix) AS cap FROM `produits` where statue = 1',
    function (error, results, fields) {
      if (error) throw error
      res.json({ status: 'ok', data: results[0] })
    }
  )
})

route.get('/getTop5', auth, (req, res) => {
  if (req.role !== 'admin' && req.role !== 'comptable') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }
  const id = req.params.id
  var query = connection.query(
    `SELECT p.nom, 
        SUM(lp.qte * p.prix * (1 - (v.remise / 100))) as gain 
        FROM produits p 
        JOIN liste_prod lp ON p.id_prod = lp.id_prod 
        JOIN ventes v ON lp.id_v = v.id_v 
        GROUP BY p.nom 
        ORDER BY gain
        LIMIT 5`,
    [id],
    function (error, results, fields) {
      if (error) throw error

      res.json({ status: 'ok', data: results })
    }
  )
})

route.get('/barChart/:par', auth, (req, res) => {
  const par = req.params.par
  if (req.role !== 'admin' && req.role !== 'comptable') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }
  let val
  switch (par) {
    case 'jour':
      val =
        'SELECT DATE_FORMAT(date_v, "%d/%m/%Y")AS date , SUM(prix_tot) AS value FROM ventes GROUP BY (DATE_FORMAT(date_v, "%d/%m/%Y")) ORDER BY date desc'
      break
    case 'mois':
      val =
        'SELECT DATE_FORMAT(date_v, "%m/%Y")AS date , SUM(prix_tot) AS value FROM ventes GROUP BY (DATE_FORMAT(date_v, "%m/%Y")) ORDER BY date desc'
      break
    case 'annee':
      val =
        'SELECT DATE_FORMAT(date_v, "%Y")AS date , SUM(prix_tot) AS value FROM ventes GROUP BY (DATE_FORMAT(date_v, "%Y")) ORDER BY date desc'
  }
  var query = connection.query(`${val}`, function (error, results, fields) {
    if (error) console.log(error)

    res.json({
      status: 'ok',
      data: results,
    })
  })
})

module.exports = route
