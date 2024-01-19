class ReviewDTO {
    constructor({first_name, last_name ,review, rating, timestamp, _user_id, _barbershop_id}) {
        this.first_name = first_name
        this.last_name = last_name
        this.review = review
        this.rating = rating
        this.timestamp = timestamp
        this._user_id = _user_id
        this._barbershop_id = _barbershop_id
    }
}

module.exports = ReviewDTO;
