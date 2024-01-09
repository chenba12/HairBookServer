var express = require('express');
var router = express.Router();
// barbershop id, barbershop name, opening hours, services
router.post('/createbarbershop', (req,res)=>{

});
// barbershop id
router.delete(('./deletebarbershop'),(req,res)=>{

});
// barbershop id, barbershop name, opening hours, services
router.put('/updatebarbershop',(req,res)=>{

});
// nothing
router.get('/mybookings', (req, res)=> {

});
// id, booking id, date
router.put('/updatebooking',(req,res)=>{

})
//booking id
router.delete('/deletebooking', (req,res)=>{

})
// nothing
router.get('/showreviews',(req,res)=>{

});
module.exports = router;