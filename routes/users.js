var express = require('express');
var router = express.Router();

/* GET users listing. */
// nothing
router.get('/allbarbershops', (req, res)=> {
    // if(ifConnect()) {


    // }
});
// _user_id
router.get('/show_my_reviews',(req,res)=>{

});
// _user_id _barbershop_id, first_name,last_name, date, review, rating
router.post('/postreview',(req,res)=>{

});
// Review
router.put('/updatereview',(req,res)=>{

});
// barbershop id, full name, date, review
router.delete('/deletereview',(req,res)=>{

});
// full name, id, barbershop id, date
router.post(('/bookhaircut'),(req,res)=>{

});
// barbershop id, book id, date
router.put(('/updatehaircut'),(req,res)=>{

});
// book id
router.delete(('/deletehaircut'),(req,res)=>{

});
// id, full name, age
router.put('/updatemydetails',(req,res)=>{

})

module.exports = router;
