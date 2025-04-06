var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bomberSchema: () => bomberSchema,
  changePasswordSchema: () => changePasswordSchema,
  contactSchema: () => contactSchema,
  contacts: () => contacts,
  creditRequestSchema: () => creditRequestSchema,
  customMessageSchema: () => customMessageSchema,
  deleteMessageSchema: () => deleteMessageSchema,
  deleteMessagesSchema: () => deleteMessagesSchema,
  insertContactSchema: () => insertContactSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertOtpSchema: () => insertOtpSchema,
  insertProtectedNumberSchema: () => insertProtectedNumberSchema,
  insertUserSchema: () => insertUserSchema,
  messages: () => messages,
  otps: () => otps,
  protectNumberSchema: () => protectNumberSchema,
  protectedNumbers: () => protectedNumbers,
  sendMessageSchema: () => sendMessageSchema,
  unprotectNumberSchema: () => unprotectNumberSchema,
  updateUserCreditsSchema: () => updateUserCreditsSchema,
  users: () => users,
  validateOtpSchema: () => validateOtpSchema,
  validatePhoneSchema: () => validatePhoneSchema
});
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  messagesRemaining: integer("messages_remaining").notNull().default(5),
  messagesSent: integer("messages_sent").notNull().default(0),
  lastActivity: timestamp("last_activity").defaultNow(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  phone: true,
  isAdmin: true
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("sent"),
  type: text("type").notNull().default("custom"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertMessageSchema = createInsertSchema(messages).pick({
  userId: true,
  phone: true,
  message: true,
  status: true,
  type: true
});
var otps = pgTable("otps", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var insertOtpSchema = createInsertSchema(otps).pick({
  phone: true,
  code: true,
  expiresAt: true
});
var validatePhoneSchema = z.object({
  phone: z.string().min(10).max(15)
});
var validateOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6)
});
var sendMessageSchema = z.object({
  phone: z.string().min(10).max(15),
  message: z.string().min(1).max(160)
});
var customMessageSchema = z.object({
  phone: z.string().min(10).max(15),
  message: z.string().min(1).max(160)
});
var bomberSchema = z.object({
  phone: z.string().min(10).max(15),
  repeat: z.number().min(1),
  // No max limit here, we'll validate against user's remaining messages in the API
  message: z.string().max(50).optional()
});
var updateUserCreditsSchema = z.object({
  username: z.string().min(3),
  credits: z.number().int().min(1)
});
var changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6)
});
var creditRequestSchema = z.object({
  reason: z.string().min(10).max(200),
  credits: z.number().int().min(1).max(100)
});
var contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertContactSchema = createInsertSchema(contacts).pick({
  userId: true,
  name: true,
  phone: true
});
var contactSchema = z.object({
  name: z.string().min(1).max(30),
  phone: z.string().min(10).max(15)
});
var deleteMessageSchema = z.object({
  id: z.number()
});
var deleteMessagesSchema = z.object({
  ids: z.array(z.number()).min(1)
});
var protectedNumbers = pgTable("protected_numbers", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  userId: integer("user_id"),
  // If null, it's protected by admin
  createdAt: timestamp("created_at").defaultNow()
});
var insertProtectedNumberSchema = createInsertSchema(protectedNumbers).pick({
  phone: true,
  userId: true
});
var protectNumberSchema = z.object({
  phone: z.string().min(10).max(15)
});
var unprotectNumberSchema = z.object({
  phone: z.string().min(10).max(15)
});

// server/storage.ts
import session2 from "express-session";
import connectPg from "connect-pg-simple";
import { Pool as Pool2 } from "@neondatabase/serverless";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, and, count, sql, ne, inArray } from "drizzle-orm";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function generateOTP() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "message-tool-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    },
    store: storage.sessionStore
  };
  app2.set("trust proxy", 1);
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        if (!user.isActive) {
          return done(null, false, { message: "Account is disabled" });
        }
        if (!await comparePasswords(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        }
        await storage.updateUserLastActivity(user.id);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      req.login(user, (err2) => {
        if (err2) return next(err2);
        res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          phone: user.phone,
          messagesRemaining: user.messagesRemaining,
          messagesSent: user.messagesSent,
          isAdmin: user.isAdmin,
          isActive: user.isActive
        });
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      messagesRemaining: user.messagesRemaining,
      messagesSent: user.messagesSent,
      isAdmin: user.isAdmin,
      isActive: user.isActive
    });
  });
}

// server/storage.ts
var PostgresSessionStore = connectPg(session2);
var pool2 = new Pool2({ connectionString: process.env.DATABASE_URL });
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: pool2,
      createTableIfMissing: true,
      tableName: "session"
    });
  }
  // Initialize database with admin user
  async initDatabase() {
    try {
      const adminUser = await this.getUserByUsername("vbs");
      if (!adminUser) {
        await this.createUser({
          username: "vbs",
          password: await hashPassword("byvbs1432"),
          fullName: "VBS Admin",
          phone: "1234567890",
          isAdmin: true
        });
        console.log("\u2713 Created default admin user");
      } else {
        console.log("\u2713 Admin user already exists");
      }
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }
  // User methods
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result.length > 0 ? result[0] : void 0;
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(sql`LOWER(${users.username})`, username.toLowerCase())).limit(1);
    return result.length > 0 ? result[0] : void 0;
  }
  async getUserByPhone(phone) {
    const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return result.length > 0 ? result[0] : void 0;
  }
  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values({
      ...insertUser,
      messagesRemaining: 5,
      messagesSent: 0,
      lastActivity: /* @__PURE__ */ new Date(),
      isActive: true,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return user;
  }
  async updateUserLastActivity(id) {
    await db.update(users).set({ lastActivity: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
  }
  async updateUserMessageCount(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (user) {
      await db.update(users).set({
        messagesRemaining: Math.max(0, user.messagesRemaining - 1),
        messagesSent: user.messagesSent + 1,
        lastActivity: /* @__PURE__ */ new Date()
      }).where(eq(users.id, id));
    }
  }
  async addUserCredits(id, credits) {
    await db.update(users).set({
      messagesRemaining: sql`${users.messagesRemaining} + ${credits}`
    }).where(eq(users.id, id));
  }
  async removeUserCredits(id, credits) {
    await db.update(users).set({
      messagesRemaining: sql`GREATEST(0, ${users.messagesRemaining} - ${credits})`
    }).where(eq(users.id, id));
  }
  async toggleUserActive(id, active) {
    await db.update(users).set({ isActive: active }).where(eq(users.id, id));
  }
  async updateUserPassword(id, password) {
    await db.update(users).set({ password }).where(eq(users.id, id));
  }
  // Message methods
  async createMessage(insertMessage) {
    const [message] = await db.insert(messages).values({
      ...insertMessage,
      status: "sent",
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return message;
  }
  async getUserMessages(userId) {
    return await db.select().from(messages).where(eq(messages.userId, userId)).orderBy(desc(messages.createdAt));
  }
  async getAllMessages() {
    const messagesWithUsers = await db.select({
      ...messages,
      username: users.username
    }).from(messages).leftJoin(users, eq(messages.userId, users.id)).orderBy(desc(messages.createdAt));
    return messagesWithUsers.map((message) => ({
      ...message,
      // Ensure sender is the username instead of SYSTEM for user-sent messages
      sender: message.sender === "SYSTEM" && message.username ? message.username : message.sender
    }));
  }
  async updateMessageStatus(id, status) {
    await db.update(messages).set({ status }).where(eq(messages.id, id));
  }
  async deleteMessage(id) {
    await db.delete(messages).where(eq(messages.id, id));
  }
  async deleteMessages(ids) {
    if (ids.length === 0) return;
    await db.delete(messages).where(inArray(messages.id, ids));
  }
  // OTP methods
  async createOtp(insertOtp) {
    const [otp] = await db.insert(otps).values({
      ...insertOtp,
      verified: false,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return otp;
  }
  async getLatestOtp(phone) {
    const result = await db.select().from(otps).where(eq(otps.phone, phone)).orderBy(desc(otps.createdAt)).limit(1);
    return result.length > 0 ? result[0] : void 0;
  }
  async verifyOtp(id) {
    await db.update(otps).set({ verified: true }).where(eq(otps.id, id));
  }
  // Contact methods
  async createContact(insertContact) {
    const [contact] = await db.insert(contacts).values({
      ...insertContact,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return contact;
  }
  async getUserContacts(userId) {
    return await db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.createdAt));
  }
  async deleteContact(id) {
    await db.delete(contacts).where(eq(contacts.id, id));
  }
  // Protected number methods
  async createProtectedNumber(phone, userId) {
    const [protectedNumber] = await db.insert(protectedNumbers).values({
      phone,
      userId: userId || null,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return protectedNumber;
  }
  async getProtectedNumbers() {
    return await db.select().from(protectedNumbers).orderBy(desc(protectedNumbers.createdAt));
  }
  async getProtectedNumbersByUser(userId) {
    return await db.select().from(protectedNumbers).where(eq(protectedNumbers.userId, userId)).orderBy(desc(protectedNumbers.createdAt));
  }
  async isNumberProtected(phone) {
    const result = await db.select().from(protectedNumbers).where(eq(protectedNumbers.phone, phone)).limit(1);
    return result.length > 0;
  }
  async deleteProtectedNumber(phone) {
    await db.delete(protectedNumbers).where(eq(protectedNumbers.phone, phone));
  }
  // Admin methods
  async getDashboardStats() {
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const [activeUsersResult] = await db.select({ count: count() }).from(users).where(and(
      eq(users.isActive, true),
      eq(users.isAdmin, false)
    ));
    const [totalMessagesResult] = await db.select({ count: count() }).from(messages);
    const [failedMessagesResult] = await db.select({ count: count() }).from(messages).where(ne(messages.status, "sent"));
    return {
      totalUsers: totalUsersResult?.count || 0,
      activeUsers: activeUsersResult?.count || 0,
      totalMessages: totalMessagesResult?.count || 0,
      failedMessages: failedMessagesResult?.count || 0
    };
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { ZodError } from "zod";
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
}
async function sendOtpMessage(phone, otp) {
  try {
    const message = `Your verification code is: ${otp}`;
    const url = `https://allapifreetest.rf.gd/coustom_sms/send_sms.php?phone=${phone}&message=${encodeURIComponent(message)}`;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const response = await fetch(url);
    const data = await response.json();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
    return data.status === "success";
  } catch (error) {
    console.error("Error sending OTP:", error);
    return false;
  }
}
async function sendCustomMessage(phone, message) {
  try {
    const url = `https://allapifreetest.rf.gd/coustom_sms/send_sms.php?phone=${phone}&message=${encodeURIComponent(message)}`;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const response = await fetch(url);
    const data = await response.json();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
    if (data.status === "success") {
      try {
        const apiResponse = JSON.parse(data.api_response);
        const messageId = apiResponse.Response?.Message?.split(":")[1]?.trim();
        return { success: true, messageId };
      } catch (e) {
        return { success: true };
      }
    }
    return { success: false, error: "Failed to send message" };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error: "Error processing request" };
  }
}
async function sendBomberMessage(phone, repeat) {
  try {
    const url = `https://hardboomber.allapifree.workers.dev/?mobile=${phone}&repeat=${repeat}`;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const response = await fetch(url);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
    if (response.ok) {
      return { success: true };
    }
    return { success: false, error: "Failed to send bomber messages" };
  } catch (error) {
    console.error("Error sending bomber messages:", error);
    return { success: false, error: "Error processing request" };
  }
}
async function registerRoutes(app2) {
  setupAuth(app2);
  const validateRequest = (schema) => {
    return (req, res, next) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            message: "Validation error",
            errors: error.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message
            }))
          });
        } else {
          next(error);
        }
      }
    };
  };
  app2.post("/api/register", validateRequest(insertUserSchema), async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingPhone = await storage.getUserByPhone(req.body.phone);
      if (existingPhone) {
        return res.status(400).json({ message: "Phone number already registered" });
      }
      const otp = generateOTP();
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      await storage.createOtp({
        phone: req.body.phone,
        code: otp,
        expiresAt
      });
      const otpSent = await sendOtpMessage(req.body.phone, otp);
      if (!otpSent) {
        return res.status(500).json({ message: "Failed to send verification code" });
      }
      res.status(200).json({
        message: "Verification code sent",
        phone: req.body.phone,
        username: req.body.username
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/verify-otp", validateRequest(validateOtpSchema), async (req, res, next) => {
    try {
      const { phone, code } = req.body;
      const otpRecord = await storage.getLatestOtp(phone);
      if (!otpRecord) {
        return res.status(400).json({ message: "No verification code found" });
      }
      if (otpRecord.verified) {
        return res.status(400).json({ message: "Code already verified" });
      }
      if (/* @__PURE__ */ new Date() > otpRecord.expiresAt) {
        return res.status(400).json({ message: "Verification code expired" });
      }
      if (otpRecord.code !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      await storage.verifyOtp(otpRecord.id);
      res.status(200).json({ message: "Verification successful" });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/complete-registration", validateRequest(insertUserSchema), async (req, res, next) => {
    try {
      const { phone } = req.body;
      const otpRecord = await storage.getLatestOtp(phone);
      if (!otpRecord || !otpRecord.verified) {
        return res.status(400).json({ message: "Phone not verified" });
      }
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password)
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          phone: user.phone,
          messagesRemaining: user.messagesRemaining,
          messagesSent: user.messagesSent,
          isAdmin: user.isAdmin,
          isActive: user.isActive
        });
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/send-message", isAuthenticated, validateRequest(sendMessageSchema), async (req, res, next) => {
    try {
      const user = req.user;
      if (!user.isActive) {
        return res.status(403).json({ message: "Your account is disabled" });
      }
      if (user.messagesRemaining <= 0) {
        return res.status(403).json({ message: "You have no messages remaining" });
      }
      const { phone, message } = req.body;
      const result = await sendCustomMessage(phone, message);
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to send message" });
      }
      await storage.updateUserMessageCount(user.id);
      const savedMessage = await storage.createMessage({
        userId: user.id,
        phone,
        message
      });
      res.status(200).json({
        message: "Message sent successfully",
        messageId: result.messageId,
        id: savedMessage.id,
        messagesRemaining: user.messagesRemaining - 1,
        messagesSent: user.messagesSent + 1
      });
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/messages", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const messages2 = await storage.getUserMessages(user.id);
      res.json(messages2);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/custom-message", isAdmin, validateRequest(customMessageSchema), async (req, res, next) => {
    try {
      const { phone, message } = req.body;
      const result = await sendCustomMessage(phone, message);
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to send message" });
      }
      res.status(200).json({
        message: `Successfully sent message to ${phone}`,
        messageId: result.messageId
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/bomber", isAdmin, validateRequest(bomberSchema), async (req, res, next) => {
    try {
      const { phone, repeat, message } = req.body;
      const isProtected = await storage.isNumberProtected(phone);
      if (isProtected) {
        return res.status(403).json({ message: "This number is protected from bomber messages" });
      }
      if (message) {
        const results = [];
        let success = 0;
        for (let i = 0; i < repeat; i++) {
          const result2 = await sendCustomMessage(phone, message);
          results.push(result2);
          if (result2.success) success++;
        }
        return res.status(200).json({
          message: `Sent ${success} of ${repeat} messages successfully`,
          results
        });
      }
      const result = await sendBomberMessage(phone, repeat);
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to send bomber messages" });
      }
      res.status(200).json({ message: `Requested ${repeat} messages to be sent` });
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/admin/users", isAdmin, async (req, res, next) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2.map((user) => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        messagesRemaining: user.messagesRemaining,
        messagesSent: user.messagesSent,
        lastActivity: user.lastActivity,
        isActive: user.isActive,
        createdAt: user.createdAt
      })));
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/add-credits", isAdmin, validateRequest(updateUserCreditsSchema), async (req, res, next) => {
    try {
      const { username, credits } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.addUserCredits(user.id, credits);
      res.status(200).json({
        message: `Added ${credits} credits to user ${username}`,
        username,
        messagesRemaining: user.messagesRemaining + credits
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/remove-credits", isAdmin, validateRequest(updateUserCreditsSchema), async (req, res, next) => {
    try {
      const { username, credits } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.removeUserCredits(user.id, credits);
      res.status(200).json({
        message: `Removed ${credits} credits from user ${username}`,
        username,
        messagesRemaining: Math.max(0, user.messagesRemaining - credits)
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/toggle-user", isAdmin, async (req, res, next) => {
    try {
      const { username, active } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.toggleUserActive(user.id, active);
      res.status(200).json({
        message: active ? `Activated user ${username}` : `Deactivated user ${username}`,
        username,
        isActive: active
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/change-password", isAuthenticated, validateRequest(changePasswordSchema), async (req, res, next) => {
    try {
      const user = req.user;
      const { currentPassword, newPassword } = req.body;
      if (!await comparePasswords(currentPassword, user.password)) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      await storage.updateUserPassword(user.id, await hashPassword(newPassword));
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/admin/dashboard-stats", isAdmin, async (req, res, next) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/admin/messages", isAdmin, async (req, res, next) => {
    try {
      const messageType = req.query.type;
      const messages2 = await storage.getAllMessages();
      if (messageType) {
        const filteredMessages = messages2.filter((message) => message.type === messageType);
        return res.json(filteredMessages);
      }
      res.json(messages2);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/admin/credit-requests", isAdmin, async (req, res, next) => {
    try {
      const messages2 = await storage.getAllMessages();
      const creditRequests = messages2.filter((message) => message.type === "credit_request");
      res.json(creditRequests);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/approve-credit-request", isAdmin, async (req, res, next) => {
    try {
      const { messageId, userId, credits } = req.body;
      await storage.addUserCredits(userId, credits);
      await storage.updateMessageStatus(messageId, "approved");
      await storage.createMessage({
        userId,
        phone: "SYSTEM",
        message: `ADMIN APPROVED ${credits} credit request`,
        status: "sent",
        type: "system"
      });
      res.status(200).json({
        message: `Successfully approved ${credits} credits`,
        credits
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/reject-credit-request", isAdmin, async (req, res, next) => {
    try {
      const { messageId } = req.body;
      await storage.updateMessageStatus(messageId, "rejected");
      res.status(200).json({
        message: "Credit request rejected"
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/delete-message", isAdmin, validateRequest(deleteMessageSchema), async (req, res, next) => {
    try {
      const { id } = req.body;
      await storage.deleteMessage(id);
      res.status(200).json({
        message: "Message deleted successfully",
        id
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/delete-messages", isAdmin, validateRequest(deleteMessagesSchema), async (req, res, next) => {
    try {
      const { ids } = req.body;
      await storage.deleteMessages(ids);
      res.status(200).json({
        message: `${ids.length} messages deleted successfully`,
        count: ids.length
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/request-credits", isAuthenticated, validateRequest(creditRequestSchema), async (req, res, next) => {
    try {
      const user = req.user;
      const { reason, credits } = req.body;
      await storage.createMessage({
        userId: user.id,
        phone: "SYSTEM",
        message: `CREDIT REQUEST - User: ${user.username}, Credits: ${credits}, Reason: ${reason}`,
        status: "pending",
        type: "credit_request"
      });
      res.status(200).json({
        message: "Credit request submitted successfully",
        credits
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/bomber", isAuthenticated, validateRequest(bomberSchema), async (req, res, next) => {
    try {
      const user = req.user;
      const { phone, repeat } = req.body;
      if (user.messagesRemaining < repeat) {
        return res.status(400).json({ message: "You don't have enough credits" });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: "Your account is suspended" });
      }
      const isProtected = await storage.isNumberProtected(phone);
      if (isProtected) {
        return res.status(403).json({ message: "This number is protected from bomber messages" });
      }
      const result = await sendBomberMessage(phone, repeat);
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to send messages" });
      }
      await storage.removeUserCredits(user.id, repeat);
      await storage.updateUserMessageCount(user.id);
      await storage.createMessage({
        userId: user.id,
        phone,
        message: `BOMBER: Sent ${repeat} messages`,
        status: "sent",
        type: "bomber"
      });
      res.status(200).json({
        message: `Successfully sent ${repeat} messages`,
        messagesRemaining: user.messagesRemaining - repeat
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/protect-number", isAdmin, validateRequest(protectNumberSchema), async (req, res, next) => {
    try {
      const { phone } = req.body;
      const isProtected = await storage.isNumberProtected(phone);
      if (isProtected) {
        return res.status(400).json({ message: "This number is already protected" });
      }
      await storage.createProtectedNumber(phone);
      res.status(200).json({
        message: "Number has been protected from bomber messages",
        phone
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/admin/unprotect-number", isAdmin, validateRequest(unprotectNumberSchema), async (req, res, next) => {
    try {
      const { phone } = req.body;
      const isProtected = await storage.isNumberProtected(phone);
      if (!isProtected) {
        return res.status(400).json({ message: "This number is not protected" });
      }
      await storage.deleteProtectedNumber(phone);
      res.status(200).json({
        message: "Protection removed from this number",
        phone
      });
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/admin/protected-numbers", isAdmin, async (req, res, next) => {
    try {
      const protectedNumbers2 = await storage.getProtectedNumbers();
      res.json(protectedNumbers2);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/protect-my-number", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const isProtected = await storage.isNumberProtected(user.phone);
      if (isProtected) {
        return res.status(400).json({ message: "Your number is already protected" });
      }
      await storage.createProtectedNumber(user.phone, user.id);
      res.status(200).json({
        message: "Your number has been protected from bomber messages"
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/unprotect-my-number", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const isProtected = await storage.isNumberProtected(user.phone);
      if (!isProtected) {
        return res.status(400).json({ message: "Your number is not protected" });
      }
      await storage.deleteProtectedNumber(user.phone);
      res.status(200).json({
        message: "Protection removed from your number"
      });
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/my-number-protection-status", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const isProtected = await storage.isNumberProtected(user.phone);
      res.json({
        isProtected,
        phone: user.phone
      });
    } catch (error) {
      next(error);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    await storage.initDatabase();
    log("Successfully initialized database");
  } catch (error) {
    log(`Error initializing database: ${error}`);
    process.exit(1);
  }
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
