import mongoose, { Schema } from "mongoose";

// ================= TYPES & INTERFACES =================

export interface IPayment {
  id: string;
  rideId: string;
  patientName: string;
  driverName: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  type: "Subsidy Payout" | "Incentive Grant" | "Fuel Subsidy";
  payoutMethod: "Direct Benefit Transfer" | "Panchayat Cash" | "GramGo Wallet";
  transactionId: string;
  createdAt: Date;
}

export interface IReport {
  id: string;
  title: string;
  category: "Dispatch Analytics" | "Driver Compliance" | "Village Coverage" | "Subsidy Disbursal";
  author: string;
  summary: string;
  status: "draft" | "certified" | "under_review";
  createdAt: Date;
}

export interface ISupportTicket {
  id: string;
  userName: string;
  userPhone: string;
  userRole: "passenger" | "driver" | "admin";
  subject: string;
  message: string;
  category: "App Access" | "Payment Dispute" | "Medical Advisory" | "GPS Delay";
  status: "open" | "in_progress" | "resolved";
  createdAt: Date;
}

// ================= SCHEMAS =================

const PaymentSchema = new Schema<IPayment>({
  rideId: { type: String, required: true },
  patientName: { type: String, required: true },
  driverName: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["completed", "pending", "failed"], default: "completed" },
  type: { type: String, required: true },
  payoutMethod: { type: String, required: true },
  transactionId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const ReportSchema = new Schema<IReport>({
  title: { type: String, required: true },
  category: { type: String, required: true },
  author: { type: String, required: true },
  summary: { type: String, required: true },
  status: { type: String, enum: ["draft", "certified", "under_review"], default: "draft" },
  createdAt: { type: Date, default: Date.now }
});

const SupportTicketSchema = new Schema<ISupportTicket>({
  userName: { type: String, required: true },
  userPhone: { type: String, required: true },
  userRole: { type: String, enum: ["passenger", "driver", "admin"], required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },
  createdAt: { type: Date, default: Date.now }
});

// ================= MODELS =================

let MongoPaymentModel: any = null;
let MongoReportModel: any = null;
let MongoSupportModel: any = null;

try {
  MongoPaymentModel = mongoose.model<IPayment>("Payment", PaymentSchema);
  MongoReportModel = mongoose.model<IReport>("Report", ReportSchema);
  MongoSupportModel = mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
} catch (e) {
  MongoPaymentModel = mongoose.models.Payment;
  MongoReportModel = mongoose.models.Report;
  MongoSupportModel = mongoose.models.SupportTicket;
}

// ================= MEMORY STORE FALLBACKS =================

class MemoryPaymentStore {
  private payments: IPayment[] = [];

  constructor() {
    this.seedDefaultPayments();
  }

  private seedDefaultPayments() {
    this.payments = [
      {
        id: "pay_1",
        rideId: "ride_seed_1",
        patientName: "Anjali Devi",
        driverName: "Amit Sharma",
        amount: 650,
        status: "completed",
        type: "Subsidy Payout",
        payoutMethod: "Direct Benefit Transfer",
        transactionId: "TXN-99882201-GG",
        createdAt: new Date(Date.now() - 4 * 3600 * 1000)
      },
      {
        id: "pay_2",
        rideId: "ride_seed_2",
        patientName: "Rajesh Kumar",
        driverName: "Ramesh Yadav",
        amount: 800,
        status: "completed",
        type: "Incentive Grant",
        payoutMethod: "GramGo Wallet",
        transactionId: "TXN-77331190-GG",
        createdAt: new Date(Date.now() - 26 * 3600 * 1000)
      },
      {
        id: "pay_3",
        rideId: "ride_seed_4",
        patientName: "Lalta Prasad",
        driverName: "Savita Devi",
        amount: 500,
        status: "completed",
        type: "Fuel Subsidy",
        payoutMethod: "Panchayat Cash",
        transactionId: "TXN-44225500-GG",
        createdAt: new Date(Date.now() - 48 * 3600 * 1000)
      },
      {
        id: "pay_4",
        rideId: "ride_seed_5",
        patientName: "Sita Verma",
        driverName: "Amit Sharma",
        amount: 650,
        status: "pending",
        type: "Subsidy Payout",
        payoutMethod: "Direct Benefit Transfer",
        transactionId: "TXN-11223344-GG",
        createdAt: new Date(Date.now() - 1 * 3600 * 1000)
      }
    ];
  }

  async find(query: any): Promise<IPayment[]> {
    return [...this.payments];
  }

  async create(data: Omit<IPayment, "id" | "createdAt">): Promise<IPayment> {
    const record: IPayment = {
      ...data,
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date()
    };
    this.payments.push(record);
    return record;
  }

  updateStatus(id: string, status: string): IPayment | null {
    const pay = this.payments.find(p => p.id === id);
    if (pay) {
      pay.status = status as any;
      return pay;
    }
    return null;
  }
}

class MemoryReportStore {
  private reports: IReport[] = [];

  constructor() {
    this.seedDefaultReports();
  }

  private seedDefaultReports() {
    this.reports = [
      {
        id: "rep_1",
        title: "Q2 Rural Healthcare Dispatch Analytics",
        category: "Dispatch Analytics",
        author: "GramGo Control Room",
        summary: "Detailed review of emergency response times in Ghazipur block, outlining an average match speed of 4.2 minutes across 12 participating village nodes.",
        status: "certified",
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000)
      },
      {
        id: "rep_2",
        title: "Volunteer Driver Compliance and Audit Summary",
        category: "Driver Compliance",
        author: "Panchayat Lead Officer",
        summary: "Quarterly inspection of driving licenses, registration credentials (RC), and fitness certificates for active bolero/tractor transit operators.",
        status: "certified",
        createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000)
      },
      {
        id: "rep_3",
        title: "Sunderpur and Sherpur Village Coverage Gaps",
        category: "Village Coverage",
        author: "Health Coordinator",
        summary: "Assesses patient travel distance gaps to Malikpur Community Health Centre and proposes 2 additional e-rickshaw lifelines.",
        status: "under_review",
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000)
      },
      {
        id: "rep_4",
        title: "June Travel Subsidy and Fuel Grants Log",
        category: "Subsidy Disbursal",
        author: "Finance Audit Team",
        summary: "Consolidated list of DBT bank payouts disbursed to local tractor & SUV volunteers for emergency maternity routes.",
        status: "draft",
        createdAt: new Date()
      }
    ];
  }

  async find(query: any): Promise<IReport[]> {
    return [...this.reports];
  }

  async create(data: Omit<IReport, "id" | "createdAt">): Promise<IReport> {
    const record: IReport = {
      ...data,
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date()
    };
    this.reports.push(record);
    return record;
  }

  updateStatus(id: string, status: string): IReport | null {
    const rep = this.reports.find(r => r.id === id);
    if (rep) {
      rep.status = status as any;
      return rep;
    }
    return null;
  }
}

class MemorySupportStore {
  private tickets: ISupportTicket[] = [];

  constructor() {
    this.seedDefaultTickets();
  }

  private seedDefaultTickets() {
    this.tickets = [
      {
        id: "sup_1",
        userName: "Ramesh Yadav",
        userPhone: "+91 98765 43210",
        userRole: "driver",
        subject: "Fuel subsidy delayed for ride_seed_2",
        message: "Completed the cardiac transport route yesterday morning. The DBT status is still shown as pending on the panel. Requesting manual approval.",
        category: "Payment Dispute",
        status: "open",
        createdAt: new Date(Date.now() - 10 * 3600 * 1000)
      },
      {
        id: "sup_2",
        userName: "Savita Devi",
        userPhone: "+91 76543 21098",
        userRole: "driver",
        subject: "GPS sync issues in Malikpur outer region",
        message: "The auto-assign system frequently disconnects when driving through outer rural coordinates. Can we get offline SMS dispatches instead?",
        category: "GPS Delay",
        status: "in_progress",
        createdAt: new Date(Date.now() - 24 * 3600 * 1000)
      },
      {
        id: "sup_3",
        userName: "Anjali Devi",
        userPhone: "+91 95551 23456",
        userRole: "passenger",
        subject: "Maternity dispatch was incredibly fast!",
        message: "Heartfelt gratitude to Amit Sharma who came on a Bolero SUV in less than 5 minutes during the delivery emergency. Exceptional program.",
        category: "Medical Advisory",
        status: "resolved",
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000)
      },
      {
        id: "sup_4",
        userName: "Mohammad Yusuf",
        userPhone: "+91 99887 76655",
        userRole: "driver",
        subject: "App login verification error",
        message: "Getting error code 403 on startup. My registration RC was approved last week. Please assist.",
        category: "App Access",
        status: "open",
        createdAt: new Date()
      }
    ];
  }

  async find(query: any): Promise<ISupportTicket[]> {
    return [...this.tickets];
  }

  async create(data: Omit<ISupportTicket, "id" | "createdAt">): Promise<ISupportTicket> {
    const record: ISupportTicket = {
      ...data,
      id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date()
    };
    this.tickets.push(record);
    return record;
  }

  updateStatus(id: string, status: string): ISupportTicket | null {
    const ticket = this.tickets.find(t => t.id === id);
    if (ticket) {
      ticket.status = status as any;
      return ticket;
    }
    return null;
  }
}

const memoryPayment = new MemoryPaymentStore();
const memoryReport = new MemoryReportStore();
const memorySupport = new MemorySupportStore();

const isMongoActive = () => mongoose.connection.readyState === 1;

// ================= EXPORTED SERVICE MODULES =================

export const PaymentDb = {
  async find(search?: string): Promise<IPayment[]> {
    if (isMongoActive() && MongoPaymentModel) {
      if (search) {
        const regex = new RegExp(search, "i");
        return MongoPaymentModel.find({
          $or: [
            { patientName: { $regex: regex } },
            { driverName: { $regex: regex } },
            { transactionId: { $regex: regex } },
            { type: { $regex: regex } },
            { payoutMethod: { $regex: regex } }
          ]
        }).sort({ createdAt: -1 });
      }
      return MongoPaymentModel.find({}).sort({ createdAt: -1 });
    }

    let results = await memoryPayment.find({});
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(p =>
        p.patientName.toLowerCase().includes(s) ||
        p.driverName.toLowerCase().includes(s) ||
        p.transactionId.toLowerCase().includes(s) ||
        p.type.toLowerCase().includes(s) ||
        p.payoutMethod.toLowerCase().includes(s)
      );
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async create(data: Omit<IPayment, "id" | "createdAt">): Promise<IPayment> {
    if (isMongoActive() && MongoPaymentModel) {
      const doc = await MongoPaymentModel.create(data);
      return doc.toObject();
    }
    return memoryPayment.create(data);
  },

  async updateStatus(id: string, status: string): Promise<IPayment | null> {
    if (isMongoActive() && MongoPaymentModel) {
      const doc = await MongoPaymentModel.findOneAndUpdate({ id }, { status }, { new: true });
      return doc ? doc.toObject() : null;
    }
    return memoryPayment.updateStatus(id, status);
  }
};

export const ReportDb = {
  async find(search?: string): Promise<IReport[]> {
    if (isMongoActive() && MongoReportModel) {
      if (search) {
        const regex = new RegExp(search, "i");
        return MongoReportModel.find({
          $or: [
            { title: { $regex: regex } },
            { author: { $regex: regex } },
            { summary: { $regex: regex } },
            { category: { $regex: regex } }
          ]
        }).sort({ createdAt: -1 });
      }
      return MongoReportModel.find({}).sort({ createdAt: -1 });
    }

    let results = await memoryReport.find({});
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(s) ||
        r.author.toLowerCase().includes(s) ||
        r.summary.toLowerCase().includes(s) ||
        r.category.toLowerCase().includes(s)
      );
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async create(data: Omit<IReport, "id" | "createdAt">): Promise<IReport> {
    if (isMongoActive() && MongoReportModel) {
      const doc = await MongoReportModel.create(data);
      return doc.toObject();
    }
    return memoryReport.create(data);
  },

  async updateStatus(id: string, status: string): Promise<IReport | null> {
    if (isMongoActive() && MongoReportModel) {
      const doc = await MongoReportModel.findOneAndUpdate({ id }, { status }, { new: true });
      return doc ? doc.toObject() : null;
    }
    return memoryReport.updateStatus(id, status);
  }
};

export const SupportDb = {
  async find(search?: string): Promise<ISupportTicket[]> {
    if (isMongoActive() && MongoSupportModel) {
      if (search) {
        const regex = new RegExp(search, "i");
        return MongoSupportModel.find({
          $or: [
            { userName: { $regex: regex } },
            { userPhone: { $regex: regex } },
            { subject: { $regex: regex } },
            { message: { $regex: regex } },
            { category: { $regex: regex } }
          ]
        }).sort({ createdAt: -1 });
      }
      return MongoSupportModel.find({}).sort({ createdAt: -1 });
    }

    let results = await memorySupport.find({});
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(t =>
        t.userName.toLowerCase().includes(s) ||
        t.userPhone.toLowerCase().includes(s) ||
        t.subject.toLowerCase().includes(s) ||
        t.message.toLowerCase().includes(s) ||
        t.category.toLowerCase().includes(s)
      );
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async create(data: Omit<ISupportTicket, "id" | "createdAt">): Promise<ISupportTicket> {
    if (isMongoActive() && MongoSupportModel) {
      const doc = await MongoSupportModel.create(data);
      return doc.toObject();
    }
    return memorySupport.create(data);
  },

  async updateStatus(id: string, status: string): Promise<ISupportTicket | null> {
    if (isMongoActive() && MongoSupportModel) {
      const doc = await MongoSupportModel.findOneAndUpdate({ id }, { status }, { new: true });
      return doc ? doc.toObject() : null;
    }
    return memorySupport.updateStatus(id, status);
  }
};
