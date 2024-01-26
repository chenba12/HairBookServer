class BarberShopDTO {
    constructor({
                    barberShopName,
                    barberName,
                    phoneNumber,
                    workingDays,
                    sundayHours,
                    mondayHours,
                    tuesdayHours,
                    wednesdayHours,
                    thursdayHours,
                    fridayHours,
                    saturdayHours,
                    totalRating,
                    location,
                    description,
                    barberId
                }) {
        this.barberShopName = barberShopName
        this.barberName = barberName
        this.phoneNumber = phoneNumber
        this.workingDays = workingDays
        this.sundayHours = sundayHours
        this.mondayHours = mondayHours
        this.tuesdayHours = tuesdayHours
        this.wednesdayHours = wednesdayHours
        this.thursdayHours = thursdayHours
        this.fridayHours = fridayHours
        this.saturdayHours = saturdayHours
        this.totalRating = totalRating
        this.location = location
        this.description = description
        this.barberId = barberId
    }
}

module.exports = BarberShopDTO;
