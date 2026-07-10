import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/drizzle.module';
import { products } from '../db/schema';

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAll() {
    return this.db.select().from(products).orderBy(asc(products.name));
  }
}
