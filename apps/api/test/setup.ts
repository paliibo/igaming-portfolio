import { installBigIntJson } from '../src/common/serialization.js';

process.env['NODE_ENV'] = 'test';
process.env['SIMULATOR_ENABLED'] = 'false';
installBigIntJson();
