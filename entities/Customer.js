class CustomerDTO {
    constructor(_id, email, first_name, last_name, age, phone_number, my_booking, my_reviews) {
        this._id = _id
        this.email = email
        this.first_name = first_name
        this.last_name = last_name
        this.age = age
        this.phone_number = phone_number
        this.my_booking = my_booking
        this.my_reviews = my_reviews
    }
}

module.exports = CustomerDTO;
