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

route.get('/getAll', auth, async (req, res) => {
  try {
    const ventes = await fetchSalesData()
    await fetchProductDataForSales(ventes)
    res.json({ status: 'ok', data: ventes })
  } catch (error) {
    console.error(error)
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
})

async function fetchSalesData() {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT c.nom as nomClient, u.nom as nomUtilisateur, v.id_v, v.prix_donnee, v.date_v, v.statue,( v.prix_tot-(v.prix_tot /100) *v.remise) as prix_tot
       FROM ventes v
       JOIN clients c ON v.id_client = c.id_client
       JOIN utilisateurs u ON v.id_utilisateur = u.id_utilisateur
       ORDER BY v.date_v DESC`,
      (error, results) => {
        if (error) {
          reject(error)
        } else {
          resolve(results)
        }
      }
    )
  })
}

async function fetchProductDataForSales(ventes) {
  const promises = ventes.map(async (vente) => {
    return new Promise((resolve, reject) => {
      connection.query(
        `SELECT p.nom,p.img, p.prix, p.qte as prodQte, p.id_prod, lp.qte as quantiteVendu
         FROM produits p
         JOIN liste_prod lp ON p.id_prod = lp.id_prod
         WHERE lp.id_v = ?`,
        [vente.id_v],
        (error, results) => {
          if (error) {
            reject(error)
          } else {
            vente.produits = results
            resolve()
          }
        }
      )
    })
  })

  await Promise.all(promises)
}

route.put('/modifyStatus/:id', auth, (req, res) => {
  if (req.role !== 'admin') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }
  const id = parseInt(req.params.id)
  const { status } = req.body

  var query = connection.query(
    'UPDATE ventes SET statue = ? WHERE id_v= ?',
    [status, id],
    function (error, results, fields) {
      if (error) throw error
      if (results.affectedRows > 0) {
        res.json({ status: 'ok', data: 'vente modifié avec succés' })
      } else {
        res.json({ status: 'ko', data: 'vente errone' })
      }
    }
  )
})
route.put('/modifyGivenPrice/:id', auth, (req, res) => {
  if (req.role !== 'admin') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }
  const id = parseInt(req.params.id)
  const { prix_donnee } = req.body

  var query = connection.query(
    'UPDATE ventes SET prix_donnee = ? WHERE id_v= ?',
    [prix_donnee, id],
    function (error, results, fields) {
      if (error) throw error
      if (results.affectedRows > 0) {
        res.json({ status: 'ok', data: 'vente modifié avec succés' })
      } else {
        res.json({ status: 'ko', data: 'vente errone' })
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
    'DELETE FROM ventes WHERE id_v =?  ',
    [id],
    function (error, results, fields) {
      if (error) throw error

      if (results.affectedRows <= 0) {
        return res.json({ status: 'ko', data: 'vente non trouve' })
      }

      res.json({
        status: 'ok',
        data: 'vente supprier ave succes',
      })
    }
  )
})

route.post('/addVente', auth, (req, res) => {
  if (req.role !== 'admin' && req.role !== 'vendeur') {
    return res.json({ status: 'ko', data: "vous n'avez pas le droit d'accès" })
  }

  let { client, id_utilisateur, tot, produits, remise, prixDonnee } = req.body
  id_utilisateur = parseInt(req.idUser)
  remise = parseFloat(remise)
  prixDonnee = parseFloat(prixDonnee)
  tot = tot * (1 - remise / 100)

  var query = connection.query(
    'INSERT INTO ventes values (?,?,?,?,?,?,?,?) ',
    [null, client, tot, prixDonnee, remise, id_utilisateur, new Date(), 1],
    function (error, results, fields) {
      if (error) throw error
      if (results.affectedRows > 0) {
        const id_v = results.insertId
        const promises = produits.map(async (produit) => {
          return new Promise((resolve, reject) => {
            connection.query(
              'INSERT INTO liste_prod values (?,?,?) ',
              [produit.ref, id_v, produit.qte],
              (error, results) => {
                if (error) {
                  reject(error)
                } else {
                  resolve()
                }
              }
            )
          })
        })
        Promise.all(promises).then(() => {
          console.log('vente ajouté avec succés')
        })
      } else {
        return res.json({ status: 'ko', data: 'vente non ajouté' })
      }
    }
  )
  const promises = produits.map(async (produit) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'UPDATE produits SET qte =qte-? WHERE id_prod = ? ',
        [produit.qte, produit.ref],
        (error, results) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        }
      )
    })
  })
  Promise.all(promises).then(() => {
    res.json({ status: 'ok', data: 'qte updated avec succés' })
  })
})

module.exports = route
