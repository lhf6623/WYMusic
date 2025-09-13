import Dexie, { type EntityTable } from "dexie";

const fileListDB = new Dexie("FileListDB") as Dexie & {
  // 分表， 网络歌曲，本地歌曲
  network: EntityTable<NetworkMp3FileInfo, "id">;
  local: EntityTable<LocalMp3FileInfo, "path">;
};
// img 字段是base64不做 索引
fileListDB.version(1).stores({
  network: "&id, path, name, singer, dt, album, lastAccessTime",
  local: "&path, id, name, singer, dt, album",
});

export default fileListDB;
