import { musicApi } from "@/tools/request";
import { UserStore } from "@/store/module/user";

enum QRCode {
  expire = 800, // 过期
  waitScan = 801, // 等待扫码
  waitConfirm = 802, // 待确认
  success = 803, // 成功
  error = 400, // 错误
}
/**
 * 检查二维码的key是否过期
 * @param key 二维码key
 * @returns
 */
export async function checkStatus(key: string, controller?: AbortController) {
  const res = await musicApi({
    key: "login_qr_check",
    args: {
      key,
      timestamp: Date.now(),
      needCookie: false,
    },
    controller,
  });
  const body = res as unknown as {
    code: QRCode;
    cookie: string;
    message: string;
  };
  return body;
}
export async function getLoginStatus(cookie = "") {
  const res = await musicApi({
    key: "login_status",
    args: {
      timestamp: Date.now(),
      cookie,
    },
  });
  const body = res as unknown as {
    data: {
      account: UserStore["account"];
      code: number;
      profile: UserStore["profile"];
    };
  };
  return body.data;
}

/**
 * 获取二维码 key
 * @returns
 */
export async function getKey() {
  const res = await musicApi({
    key: "login_qr_key",
    args: {
      timestamp: Date.now(),
      needCookie: false,
    },
  });
  const body = res as unknown as {
    code: number;
    data: {
      code: number;
      unikey: string;
    };
  };
  const key = body.data.unikey;
  return key;
}

/**
 * 获取二维码图片 base64 数据
 * @param key 二维码 key
 * @returns
 */
export async function getQrImg(key: string) {
  const res = await musicApi({
    key: "login_qr_create",
    args: {
      key,
      qrimg: true,
      timestamp: Date.now(),
      needCookie: false,
    },
  });
  const body = res as unknown as {
    code: number;
    data: {
      qrurl: string;
      qrimg: string;
    };
  };
  return body.data.qrimg;
}

export async function anonimousLogin() {
  // 接口类型没有这个东西
  const res = await musicApi({
    key: "register_anonimous" as any,
    args: {
      timestamp: Date.now(),
    },
  });

  const body = res as unknown as {
    code: number;
    cookie: string;
    createTime: number;
    userId: number;
  };

  return body.cookie;
}
