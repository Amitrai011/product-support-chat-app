import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Seeds the database with a set of luxury products and demo accounts so the app
 * is usable immediately after `npm run db:seed`.
 *
 * Idempotent: it clears the chat/product/user tables first, then re-inserts.
 */
async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://localhost:5432/luxe_support',
  });
  const db = drizzle(pool, { schema });

  console.log('🌱  Seeding database…');

  // Clear existing data (messages -> conversations -> products/users via cascade,
  // but we delete explicitly for clarity and to reset the demo state).
  await db.delete(schema.messages);
  await db.delete(schema.conversations);
  await db.delete(schema.products);
  await db.delete(schema.users);

  const passwordHash = await bcrypt.hash('password123', 10);

  // --- Demo accounts (all use the password: password123) ---
  await db.insert(schema.users).values([
    {
      email: 'agent@luxe.com',
      passwordHash,
      name: 'Isabella (Support)',
      role: 'agent',
    },
    {
      email: 'agent2@luxe.com',
      passwordHash,
      name: 'Marcus (Support)',
      role: 'agent',
    },
    {
      email: 'customer@luxe.com',
      passwordHash,
      name: 'Olivia Chen',
      role: 'customer',
    },
    {
      email: 'customer2@luxe.com',
      passwordHash,
      name: 'James Whitmore',
      role: 'customer',
    },
  ]);

  // --- Luxury catalogue ---
  await db.insert(schema.products).values([
    {
      name: 'Aurelia Chronograph',
      tagline: '18k rose-gold automatic timepiece',
      description:
        'A Swiss-made automatic movement housed in a 40mm 18k rose-gold case, with a hand-finished guilloché dial and alligator strap. Water resistant to 50m.',
      priceCents: 1875000,
      currency: 'USD',
      category: 'Watches',
      imageUrl:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Noir Leather Tote',
      tagline: 'Full-grain calfskin, handcrafted in Florence',
      description:
        'A structured tote in full-grain Italian calfskin with palladium hardware, a suede-lined interior and detachable pouch. Made by third-generation artisans in Florence.',
      priceCents: 320000,
      currency: 'USD',
      category: 'Leather Goods',
      imageUrl:
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Céleste Diamond Necklace',
      tagline: '2.4ct brilliant-cut diamonds set in platinum',
      description:
        'A graduated rivière of 2.4 carats of ethically-sourced, brilliant-cut diamonds set in polished platinum, finished with a concealed clasp.',
      priceCents: 4200000,
      currency: 'USD',
      category: 'Fine Jewellery',
      imageUrl:
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Solstice Sunglasses',
      tagline: 'Titanium frame with polarised lenses',
      description:
        'Lightweight aerospace-grade titanium frames with hand-polished polarised lenses and a bio-acetate temple tip. Includes a leather case.',
      priceCents: 78000,
      currency: 'USD',
      category: 'Accessories',
      imageUrl:
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Maison Silk Scarf',
      tagline: 'Hand-rolled mulberry silk twill',
      description:
        'A 90cm square of mulberry silk twill printed with an in-house archival motif and finished with hand-rolled edges.',
      priceCents: 52000,
      currency: 'USD',
      category: 'Accessories',
      imageUrl:
        'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Estate Eau de Parfum',
      tagline: 'Oud, bergamot & Damask rose — 100ml',
      description:
        'A niche fragrance built on Laotian oud, Calabrian bergamot and Damask rose, presented in a hand-blown crystal flacon.',
      priceCents: 46000,
      currency: 'USD',
      category: 'Fragrance',
      imageUrl:
        'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80',
    },
  ]);

  console.log('✅  Seed complete.');
  console.log('');
  console.log('   Demo accounts (password for all: "password123"):');
  console.log('   • Agent    → agent@luxe.com');
  console.log('   • Agent    → agent2@luxe.com');
  console.log('   • Customer → customer@luxe.com');
  console.log('   • Customer → customer2@luxe.com');

  await pool.end();
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
