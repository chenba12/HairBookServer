class BarberShopDTO {
    constructor({
                    barbershopName,
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
        this.barbershopName = barbershopName
        this.phoneNumber = phoneNumber
        this.workingDays = workingDays
        this.sundayHours = sundayHours
        this.mondayHours = mondayHours
        this.tuesdayHours = tuesdayHours
        this.wednesdayHours = wednesdayHours
        this.thursdayHours = thursdayHours
        this.fridayHours = fridayHours
        this.saturdayHours = saturdayHours
        this.toalRating = totalRating
        this.location = location
        this.description = description
        this.barberId = barberId
    }
}

module.exports = BarberShopDTO;
