import { defineStore } from "pinia";
import { versionKey } from "..";
import {
  checkStatus,
  getKey,
  getLoginStatus,
  getQrImg,
  anonimousLogin,
} from "@/tools/api_user";

export interface UserStore {
  /** 二维码登入定时器 */
  qrTim: number | null;
  /** 扫码登入 =》 二维码的key */
  qrKey?: string;
  /** 扫码登入 =》 二维码 */
  qrImg?: string;
  /** 登入后的用户身份信息cookie */
  cookie?: string;
  /** 账号简略信息 */
  account: {
    anonimousUser: boolean;
    ban: number;
    baoyueVersion: number;
    createTime: number;
    donateVersion: number;
    id: number;
    paidFee: boolean;
    status: number;
    tokenVersion: number;
    type: number;
    userName: string;
    vipType: number;
    whitelistAuthority: number;
  } | null;
  /** 账号详细信息 */
  profile: {
    userId: number;
    userType: number;
    nickname: string;
    avatarImgId: number;
    avatarUrl: string;
    backgroundImgId: number;
    backgroundUrl: string;
    signature: null | string;
    createTime: number;
    userName: string;
    accountType: number;
    shortUserName: string;
    birthday: number;
    authority: number;
    gender: number;
    accountStatus: number;
    province: number;
    city: number;
    authStatus: number;
    description: null | string;
    detailDescription: null | string;
    defaultAvatar: boolean;
    expertTags: null | string;
    experts: null | string;
    djStatus: number;
    locationStatus: number;
    vipType: number;
    followed: boolean;
    mutual: boolean;
    authenticated: boolean;
    lastLoginTime: number;
    lastLoginIP: string;
    remarkName: null | string;
    viptypeVersion: number;
    authenticationTypes: number;
    avatarDetail: null | string;
    anchor: boolean;
  } | null;
  /** 二维码状态 */
  qrCode: number;
  /** 刷新二维码的 controller */
  controller: AbortController | null;
}
export const useUserStore = defineStore("user", {
  persist: {
    key: versionKey("user"),
    omit: ["qrTim", "controller", "qrCode"],
  },
  state: (): UserStore => {
    return {
      qrTim: null,
      cookie: "",
      qrKey: "",
      qrImg: "",
      qrCode: 801,
      account: null,
      profile: null,
      controller: null,
    };
  },
  actions: {
    /** 游客登入 */
    async touristLogin() {
      const cookie = await anonimousLogin();
      this.setCookie(cookie);
      try {
        const { account, profile } = await getLoginStatus(cookie);
        this.account = account;
        this.profile = profile;
      } catch (e) {
        this.account = null;
        this.profile = null;
      }
    },
    /** 二维码登入 */
    async qrLogin(flag = true) {
      if (this.qrTim) {
        clearInterval(this.qrTim);
        this.qrTim = null;
      }
      if (this.controller) {
        this.controller.abort();
        this.controller = null;
      }
      if (!flag) {
        return;
      }
      if (this.cookie) return;

      if (!this.cookie && !this.qrKey) {
        this.qrKey = await getKey();
        this.qrImg = await getQrImg(this.qrKey);
      }

      this.qrTim = setInterval(async () => {
        if (this.cookie && this.qrTim) {
          clearInterval(this.qrTim);
          this.qrTim = null;
          this.controller?.abort();
          this.controller = null;
          return;
        }
        this.controller = new AbortController();

        const { code, cookie } = await checkStatus(
          this.qrKey as string,
          this.controller!
        );
        this.qrCode = code;
        if (code === 400) return;
        // 二维码过期
        if (code === 800) {
          this.refreshQrCode();
        } else if (code === 803) {
          this.setCookie(cookie);

          const { account, profile } = await getLoginStatus(cookie);
          this.account = account;
          this.profile = profile;

          clearInterval(this.qrTim!);
          this.controller!.abort();
          this.controller = null;
          this.qrTim = null;
        }
      }, 3000);
    },
    /** 刷新二维码 */
    async refreshQrCode() {
      this.setCookie("");
      this.qrLogin(true);
    },
    /** 退出 */
    logout() {
      this.setCookie("");
      this.qrLogin();
      this.account = null;
      this.profile = null;
    },
    setCookie(cookie: string) {
      this.cookie = cookie;
      this.qrImg = "";
      this.qrKey = "";
      this.qrCode = 801;
    },
    async getUserInfo() {
      const { account, profile } = await getLoginStatus();
      this.account = account;
      this.profile = profile;
    },
  },
});
