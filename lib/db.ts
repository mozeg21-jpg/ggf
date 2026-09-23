import "server-only";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

// تحديد مسار قاعدة البيانات للعمل بشكل سليم في بيئات Serverless مثل Vercel
function getDatabasePath(): string {
  // المسار الافتراضي للملف المحلي
  const localPath = path.resolve(process.cwd(), "dev.db");
  
  // إذا كنا في بيئة Vercel أو بيئة الإنتاج، نستخدم مجلد /tmp لضمان قابلية الكتابة
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    const tmpPath = "/tmp/dev.db";
    // إذا لم تكن قاعدة البيانات موجودة في /tmp ولكنها موجودة في مجلد المشروع، نقوم بنسخها
    if (!fs.existsSync(tmpPath)) {
      if (fs.existsSync(localPath)) {
        try {
          fs.copyFileSync(localPath, tmpPath);
        } catch (e) {
          console.error("Failed to copy dev.db to /tmp", e);
        }
      }
    }
    return tmpPath;
  }
  
  return localPath;
}

const dbPath = getDatabasePath();

// فتح الاتصال بقاعدة البيانات مع تفعيل الـ WAL والـ Foreign Keys لأعلى أداء
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
});

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// إنشاء الجداول إذا لم تكن موجودة
db.exec(`
  CREATE TABLE IF NOT EXISTS Product (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE,
    name TEXT NOT NULL,
    shortDesc TEXT,
    description TEXT DEFAULT '',
    priceCents INTEGER NOT NULL,
    compareAtCents INTEGER,
    currency TEXT DEFAULT 'EGP',
    type TEXT DEFAULT 'physical',
    images TEXT DEFAULT '[]',
    featured INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    passwordHash TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "Order" (
    id TEXT PRIMARY KEY,
    orderNumber TEXT UNIQUE NOT NULL,
    userId TEXT,
    customerName TEXT NOT NULL,
    customerPhone TEXT NOT NULL,
    customerEmail TEXT,
    address TEXT,
    paymentMethod TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    subtotalCents INTEGER NOT NULL,
    shippingCents INTEGER DEFAULT 0,
    totalCents INTEGER DEFAULT 0,
    proofImage TEXT,
    note TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS Setting (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT '',
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS OrderItem (
    id TEXT PRIMARY KEY,
    orderId TEXT NOT NULL,
    productId TEXT,
    name TEXT NOT NULL,
    priceCents INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY(orderId) REFERENCES "Order"(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_product_active_featured ON Product(active, featured);
  CREATE INDEX IF NOT EXISTS idx_order_userId ON "Order"(userId);
  CREATE INDEX IF NOT EXISTS idx_order_status ON "Order"(status);
  CREATE INDEX IF NOT EXISTS idx_orderitem_orderId ON OrderItem(orderId);
`);

// دالة بذر البيانات التلقائية عند أول تشغيل وتأكد وجود المنتجات والحساب الإداري
function autoSeed() {
  const productCountRow = db.prepare("SELECT COUNT(*) as count FROM Product").get() as { count: number };
  if (productCountRow.count === 0) {
    console.log("🌱 Database empty. Seeding default products...");
    
    const defaultProducts = [
      {
        id: "prod_1",
        slug: "course-fullstack",
        name: "كورس فُل-ستاك من الصفر للاحتراف",
        shortDesc: "أكتر من 40 ساعة عملي + مشاريع حقيقية",
        description: "كورس شامل يمشي معاك خطوة بخطوة من أساسيات الويب لحد ما تبني وتنشر مشاريع كاملة. يشمل تمارين، مشاريع، وشهادة إتمام.",
        priceCents: 79900,
        compareAtCents: 149900,
        type: "digital",
        images: JSON.stringify(["/products/course-fullstack.svg"]),
        featured: 1,
        active: 1
      },
      {
        id: "prod_2",
        slug: "ebook-freelance",
        name: "كتاب: دليل الفريلانسر المصري",
        shortDesc: "PDF عملي لبدء دخلك بالدولار",
        description: "دليل عملي (PDF) بيشرح إزاي تبدأ شغل حر، تظبط بروفايلك، وتجيب أول عميل — بأمثلة من السوق المصري.",
        priceCents: 14900,
        compareAtCents: 24900,
        type: "digital",
        images: JSON.stringify(["/products/ebook-freelance.svg"]),
        featured: 1,
        active: 1
      },
      {
        id: "prod_3",
        slug: "notebook-dev",
        name: "نوتة المبرمج الأنيقة",
        shortDesc: "نوتة A5 غلاف صلب + تصميم خاص",
        description: "نوتة عملية بغلاف صلب وورق فاخر، مصممة لملاحظات الأكواد والأفكار. مقاس A5، 200 صفحة.",
        priceCents: 18000,
        compareAtCents: null,
        type: "physical",
        images: JSON.stringify(["/products/notebook-dev.svg"]),
        featured: 1,
        active: 1
      },
      {
        id: "prod_4",
        slug: "tshirt-code",
        name: "تيشيرت \"It works on my machine\"",
        shortDesc: "قطن 100% — مقاسات متعددة",
        description: "تيشيرت قطن مريح بطبعة عالية الجودة. متوفر بمقاسات S / M / L / XL بألوان متعددة.",
        priceCents: 29900,
        compareAtCents: 39900,
        type: "physical",
        images: JSON.stringify(["/products/tshirt-code.svg"]),
        featured: 1,
        active: 1
      },
      {
        id: "prod_5",
        slug: "template-portfolio",
        name: "قالب بورتفوليو جاهز (Next.js)",
        shortDesc: "قالب احترافي تنشره في دقايق",
        description: "قالب بورتفوليو جاهز بتقنية Next.js + Tailwind، سهل التخصيص وجاهز للنشر. يشمل صفحات أعمال ومدونة وتواصل.",
        priceCents: 24900,
        compareAtCents: null,
        type: "digital",
        images: JSON.stringify(["/products/template-portfolio.svg"]),
        featured: 1,
        active: 1
      },
      {
        id: "prod_6",
        slug: "mug-coffee",
        name: "مج القهوة \"while(alive) code()\"",
        shortDesc: "سيراميك 350ml — يدخل الميكروويف",
        description: "مج سيراميك بجودة عالية وطبعة ثابتة لا تبهت. سعة 350ml، آمن للميكروويف والغسالة.",
        priceCents: 12000,
        compareAtCents: 16000,
        type: "physical",
        images: JSON.stringify(["/products/mug-coffee.svg"]),
        featured: 0,
        active: 1
      }
    ];

    const insertProd = db.prepare(`
      INSERT INTO Product (id, slug, name, shortDesc, description, priceCents, compareAtCents, type, images, featured, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const p of defaultProducts) {
        insertProd.run(p.id, p.slug, p.name, p.shortDesc, p.description, p.priceCents, p.compareAtCents, p.type, p.images, p.featured, p.active);
      }
    })();
  }

  // بذر حساب المدير الأدمن
  const adminEmail = process.env.ADMIN_EMAIL || "admin@syntax.eg";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";
  
  const adminRow = db.prepare("SELECT * FROM User WHERE email = ?").get(adminEmail);
  if (!adminRow) {
    console.log("👤 Seeding admin user...");
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`
      INSERT INTO User (id, name, email, passwordHash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run("admin_user_1", "أدمن المتجر", adminEmail, passwordHash, "admin");
    console.log(`✅ Admin ready: ${adminEmail}`);
  }
}

// تشغيل البذر التلقائي
try {
  autoSeed();
} catch (e) {
  console.error("Failed to seed database automatically", e);
}

export default db;
