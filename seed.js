require('dotenv').config();

const { initializeDatabase, getDb, closeDatabase } = require('./src/config/database');
const bcrypt = require('bcryptjs');

function seed() {
  console.log('🌱 Seeding database...\n');

  const db = initializeDatabase();

  // Clear existing data
  db.exec('DELETE FROM records');
  db.exec('DELETE FROM users');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users', 'records')");

  // ─── Seed Users ──────────────────────────────────────────────────────

  const users = [
    {
      name: 'Admin User',
      email: 'admin@finance.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
    },
    {
      name: 'Analyst User',
      email: 'analyst@finance.com',
      password: bcrypt.hashSync('analyst123', 10),
      role: 'analyst',
    },
    {
      name: 'Viewer User',
      email: 'viewer@finance.com',
      password: bcrypt.hashSync('viewer123', 10),
      role: 'viewer',
    },
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  );

  const userIds = [];
  for (const user of users) {
    const result = insertUser.run(user.name, user.email, user.password, user.role);
    userIds.push(result.lastInsertRowid);
    console.log(`  ✅ Created user: ${user.email} (${user.role}) — password: ${user.email.split('@')[0]}123`);
  }

  const adminId = userIds[0];

  // ─── Seed Financial Records ──────────────────────────────────────────

  const records = [
    // Income records
    { amount: 75000, type: 'income', category: 'salary', date: '2026-01-15', description: 'January salary' },
    { amount: 75000, type: 'income', category: 'salary', date: '2026-02-15', description: 'February salary' },
    { amount: 75000, type: 'income', category: 'salary', date: '2026-03-15', description: 'March salary' },
    { amount: 12000, type: 'income', category: 'freelance', date: '2026-01-20', description: 'Website development project' },
    { amount: 8500, type: 'income', category: 'freelance', date: '2026-02-28', description: 'Mobile app consultation' },
    { amount: 5000, type: 'income', category: 'investment', date: '2026-01-31', description: 'Dividend income Q1' },
    { amount: 3200, type: 'income', category: 'investment', date: '2026-03-31', description: 'Stock gains realized' },
    { amount: 15000, type: 'income', category: 'bonus', date: '2026-03-01', description: 'Q1 performance bonus' },

    // Expense records
    { amount: 25000, type: 'expense', category: 'rent', date: '2026-01-01', description: 'January rent payment' },
    { amount: 25000, type: 'expense', category: 'rent', date: '2026-02-01', description: 'February rent payment' },
    { amount: 25000, type: 'expense', category: 'rent', date: '2026-03-01', description: 'March rent payment' },
    { amount: 4500, type: 'expense', category: 'utilities', date: '2026-01-10', description: 'Electricity and water bill' },
    { amount: 4200, type: 'expense', category: 'utilities', date: '2026-02-10', description: 'Electricity and water bill' },
    { amount: 4800, type: 'expense', category: 'utilities', date: '2026-03-10', description: 'Electricity and water bill' },
    { amount: 8000, type: 'expense', category: 'groceries', date: '2026-01-05', description: 'Monthly groceries' },
    { amount: 7500, type: 'expense', category: 'groceries', date: '2026-02-05', description: 'Monthly groceries' },
    { amount: 8200, type: 'expense', category: 'groceries', date: '2026-03-05', description: 'Monthly groceries' },
    { amount: 3000, type: 'expense', category: 'transportation', date: '2026-01-12', description: 'Fuel and maintenance' },
    { amount: 2800, type: 'expense', category: 'transportation', date: '2026-02-12', description: 'Fuel and commute' },
    { amount: 3200, type: 'expense', category: 'transportation', date: '2026-03-12', description: 'Fuel, servicing' },
    { amount: 2000, type: 'expense', category: 'entertainment', date: '2026-01-18', description: 'Movies and dining out' },
    { amount: 3500, type: 'expense', category: 'entertainment', date: '2026-02-14', description: "Valentine's day dinner" },
    { amount: 1500, type: 'expense', category: 'entertainment', date: '2026-03-22', description: 'Concert tickets' },
    { amount: 5000, type: 'expense', category: 'healthcare', date: '2026-02-20', description: 'Annual health checkup' },
    { amount: 12000, type: 'expense', category: 'education', date: '2026-01-08', description: 'Online course subscription' },
    { amount: 6000, type: 'expense', category: 'insurance', date: '2026-01-25', description: 'Life insurance premium Q1' },
  ];

  const insertRecord = db.prepare(
    `INSERT INTO records (amount, type, category, date, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertRecords = db.transaction((records) => {
    for (const record of records) {
      insertRecord.run(
        record.amount,
        record.type,
        record.category,
        record.date,
        record.description,
        adminId
      );
    }
  });

  insertRecords(records);
  console.log(`\n  ✅ Created ${records.length} financial records\n`);

  // ─── Summary ─────────────────────────────────────────────────────────

  const totalIncome = records
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpenses = records
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);

  console.log('  📊 Seed Summary:');
  console.log(`     Users   : ${users.length}`);
  console.log(`     Records : ${records.length}`);
  console.log(`     Income  : ₹${totalIncome.toLocaleString()}`);
  console.log(`     Expenses: ₹${totalExpenses.toLocaleString()}`);
  console.log(`     Net     : ₹${(totalIncome - totalExpenses).toLocaleString()}\n`);

  console.log('  🔐 Login Credentials:');
  console.log('     admin@finance.com    / admin123    (Admin)');
  console.log('     analyst@finance.com  / analyst123  (Analyst)');
  console.log('     viewer@finance.com   / viewer123   (Viewer)\n');

  closeDatabase();
  console.log('✅ Database seeded successfully!\n');
}

seed();
