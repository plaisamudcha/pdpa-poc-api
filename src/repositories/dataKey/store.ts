import type { DataKeyStore } from '@pdpa/crypto';
import { initMongo } from '@/databases/mongoose';
import DataKeyModel from '@/externals/mongo/collections/data-key.collection';

/** DataKeyStore ของ @pdpa/crypto บน collection data_keys (_id = userId) */
const mongoDataKeyStore: DataKeyStore = {
  async insert({ id, wrappedDek, kekVersion }) {
    await initMongo();
    await DataKeyModel.create({ _id: id, wrappedDek, kekVersion });
  },

  async find(id) {
    await initMongo();
    const doc = await DataKeyModel.findById(id).lean();
    return doc ? { id: doc._id, wrappedDek: doc.wrappedDek, kekVersion: doc.kekVersion } : null;
  },

  async delete(id) {
    await initMongo();
    await DataKeyModel.deleteOne({ _id: id });
  },

  async *listNotOnVersion(kekVersion) {
    await initMongo();
    for await (const doc of DataKeyModel.find({ kekVersion: { $ne: kekVersion } })
      .lean()
      .cursor()) {
      yield { id: doc._id, wrappedDek: doc.wrappedDek, kekVersion: doc.kekVersion };
    }
  },

  async updateWrapped(id, wrappedDek, kekVersion) {
    await initMongo();
    await DataKeyModel.updateOne({ _id: id }, { $set: { wrappedDek, kekVersion, rotatedAt: new Date() } });
  },
};

export default mongoDataKeyStore;
