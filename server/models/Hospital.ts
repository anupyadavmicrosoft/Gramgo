import mongoose, { Schema } from "mongoose";

export interface IHospital {
  id: string;
  name: string;
  type: string; // "CHC" | "PHC" | "District Hospital" | "Private Hospital"
  village: string;
  district: string;
  distanceKm: number;
  bedsAvailable: number;
  totalBeds: number;
  contactNumber: string;
  hasVentilator: boolean;
  hasICU: boolean;
  hasBloodBank: boolean;
  hasOxygen: boolean;
  specialty: string;
  lat: number;
  lng: number;
  createdAt: number;
}

const HospitalSchema = new Schema<IHospital>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  village: { type: String, required: true },
  district: { type: String, required: true },
  distanceKm: { type: Number, required: true },
  bedsAvailable: { type: Number, required: true },
  totalBeds: { type: Number, required: true },
  contactNumber: { type: String, required: true },
  hasVentilator: { type: Boolean, default: false },
  hasICU: { type: Boolean, default: false },
  hasBloodBank: { type: Boolean, default: false },
  hasOxygen: { type: Boolean, default: false },
  specialty: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  createdAt: { type: Number, required: true }
});

let MongoHospitalModel: any = null;
try {
  MongoHospitalModel = mongoose.model<IHospital>("Hospital", HospitalSchema);
} catch (e) {
  MongoHospitalModel = mongoose.models.Hospital;
}

const isMongoActive = () => mongoose.connection.readyState === 1;

// Seed datasets matching the GramGo Ghazipur ecosystem
const initialHospitals: IHospital[] = [
  {
    id: "hosp_1",
    name: "Ghazipur District Hospital & Trauma Centre",
    type: "District Hospital",
    village: "Ghazipur City",
    district: "Ghazipur",
    distanceKm: 14.5,
    bedsAvailable: 85,
    totalBeds: 250,
    contactNumber: "0548-2220456",
    hasVentilator: true,
    hasICU: true,
    hasBloodBank: true,
    hasOxygen: true,
    specialty: "Surgical Trauma, Critical Emergency, Cardiac Care",
    lat: 25.5812,
    lng: 83.5714,
    createdAt: Date.now()
  },
  {
    id: "hosp_2",
    name: "Community Health Centre, Sherpur",
    type: "CHC",
    village: "Sherpur",
    district: "Ghazipur",
    distanceKm: 4.2,
    bedsAvailable: 12,
    totalBeds: 30,
    contactNumber: "0548-2220108",
    hasVentilator: true,
    hasICU: false,
    hasBloodBank: false,
    hasOxygen: true,
    specialty: "Maternity, Neonatal Care & Antivenom (ASV)",
    lat: 25.5721,
    lng: 83.5824,
    createdAt: Date.now()
  },
  {
    id: "hosp_3",
    name: "Primary Health Centre, Malikpur",
    type: "PHC",
    village: "Malikpur",
    district: "Ghazipur",
    distanceKm: 7.5,
    bedsAvailable: 4,
    totalBeds: 10,
    contactNumber: "0548-2220102",
    hasVentilator: false,
    hasICU: false,
    hasBloodBank: false,
    hasOxygen: false,
    specialty: "General Outpatient, First Aid, Snakebite Treatment",
    lat: 25.5901,
    lng: 83.5611,
    createdAt: Date.now()
  },
  {
    id: "hosp_4",
    name: "Sub-District Hospital, Mohammadabad",
    type: "District Hospital",
    village: "Mohammadabad",
    district: "Ghazipur",
    distanceKm: 12.0,
    bedsAvailable: 45,
    totalBeds: 100,
    contactNumber: "0548-2234567",
    hasVentilator: true,
    hasICU: true,
    hasBloodBank: false,
    hasOxygen: true,
    specialty: "Comprehensive Surgery, Pediatric & Gynaecology",
    lat: 25.6142,
    lng: 83.7548,
    createdAt: Date.now()
  },
  {
    id: "hosp_5",
    name: "Maa Sharda Multi-Speciality Clinic",
    type: "Private Hospital",
    village: "Yusufpur",
    district: "Ghazipur",
    distanceKm: 11.2,
    bedsAvailable: 18,
    totalBeds: 40,
    contactNumber: "+91 94544 98765",
    hasVentilator: false,
    hasICU: true,
    hasBloodBank: false,
    hasOxygen: true,
    specialty: "Orthopedics, Internal Medicine & General Surgery",
    lat: 25.6085,
    lng: 83.7312,
    createdAt: Date.now()
  }
];

let memoryHospitalsStore: IHospital[] = [...initialHospitals];

export const HospitalDb = {
  async seed(): Promise<void> {
    if (isMongoActive() && MongoHospitalModel) {
      const count = await MongoHospitalModel.countDocuments();
      if (count === 0) {
        await MongoHospitalModel.insertMany(initialHospitals);
        console.log("Seeded default hospitals database successfully.");
      }
    }
  },

  async save(hosp: IHospital): Promise<IHospital> {
    if (isMongoActive() && MongoHospitalModel) {
      const existing = await MongoHospitalModel.findOne({ id: hosp.id });
      if (existing) {
        await MongoHospitalModel.updateOne({ id: hosp.id }, { $set: hosp });
        return hosp;
      } else {
        await MongoHospitalModel.create(hosp);
        return hosp;
      }
    }
    const idx = memoryHospitalsStore.findIndex(h => h.id === hosp.id);
    if (idx !== -1) {
      memoryHospitalsStore[idx] = { ...hosp };
    } else {
      memoryHospitalsStore.push({ ...hosp });
    }
    return hosp;
  },

  async findAll(): Promise<IHospital[]> {
    if (isMongoActive() && MongoHospitalModel) {
      const docs = await MongoHospitalModel.find({});
      if (docs && docs.length > 0) {
        return docs.map((d: any) => d.toObject());
      }
    }
    return memoryHospitalsStore;
  },

  async findById(id: string): Promise<IHospital | null> {
    if (isMongoActive() && MongoHospitalModel) {
      const doc = await MongoHospitalModel.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const found = memoryHospitalsStore.find(h => h.id === id);
    return found ? { ...found } : null;
  },

  async delete(id: string): Promise<boolean> {
    if (isMongoActive() && MongoHospitalModel) {
      const res = await MongoHospitalModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const idx = memoryHospitalsStore.findIndex(h => h.id === id);
    if (idx !== -1) {
      memoryHospitalsStore.splice(idx, 1);
      return true;
    }
    return false;
  }
};
