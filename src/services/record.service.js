const Record = require('../models/Record');
const { AppError } = require('../middleware/errorHandler');

class RecordService {
  static createRecord(data) {
    return Record.create(data);
  }

  static getRecords(filters) {
    return Record.findAll(filters);
  }

  static getRecordById(id) {
    const record = Record.findById(id);
    if (!record) {
      throw new AppError('Record not found', 404, 'NOT_FOUND');
    }
    return record;
  }

  static updateRecord(id, data) {
    const record = Record.findById(id);
    if (!record) {
      throw new AppError('Record not found', 404, 'NOT_FOUND');
    }

    return Record.update(id, data);
  }

  static deleteRecord(id) {
    const record = Record.findById(id);
    if (!record) {
      throw new AppError('Record not found', 404, 'NOT_FOUND');
    }

    return Record.softDelete(id);
  }
}

module.exports = RecordService;
