<template>
  <ul px6px relative overflow-auto hfull class="*:py6px">
    <!-- 用户信息 -->
    <li flex justify-between v-if="userStatus === 'USER' && settingStore.testApiAudioUrl">
      <div flex items-center gap-10px>
        <NAvatar :src="userStore.profile?.avatarUrl">
        </NAvatar>
        <span>{{ userStore.profile?.nickname }}</span>
      </div>
      <NPopconfirm @positive-click="userStore.logout" :show-icon="false">
        <template #trigger>
          <NButton title="退出" type="error" size="small" text>
            <template #icon>
              <i i-material-symbols:logout></i>
            </template>
          </NButton>
        </template>
        确认退出
      </NPopconfirm>
    </li>
    <!-- 游客信息 -->
    <li v-if="userStatus === 'TOURIST' && settingStore.testApiAudioUrl" flex justify-between items-center>
      <span text-yellow-9>游客</span>
      <NPopconfirm @positive-click="userStore.logout" :show-icon="false">
        <template #trigger>
          <NButton title="退出" type="error" size="small" text>
            <template #icon>
              <i i-material-symbols:logout></i>
            </template>
          </NButton>
        </template>
        确认退出
      </NPopconfirm>
    </li>
    <!-- 登入操作 -->
    <li flex-col flex-center gap-2px v-if="userStatus === 'NOT' && settingStore.testApiAudioUrl">
      <!-- 未登入 -->
      <div v-if="userStatus === 'NOT'" flex-center flex-col>
        <NSpin :show="userStore.qrCode === 802">
          <NImage preview-disabled :src="userStore.qrImg">
            <template #placeholder>
              <i animate-spin i-eos-icons:three-dots-loading w80px h80px></i>
            </template>
          </NImage>
          <template #description>
            <NButton @click="userStore.refreshQrCode" class="!bg-#fff">刷新二维码</NButton>
          </template>
        </NSpin>
        <NButton :loading="login" @click="touristLogin" px6px>
          <span text-red-600>点击</span>
          游客登入
        </NButton>
      </div>
    </li>
    <!-- 下载目录展示 -->
    <li>
      <span>下载目录：</span>
      <p>
        <NInputGroup>
          <NInput disabled :value="settingStore.localAudioDir"></NInput>
          <NButton disabled>更改</NButton>
        </NInputGroup>
      </p>
    </li>
    <!-- 歌曲请求地址展示 -->
    <li>
      <span>请求地址：</span>
      <p>
        <NInputGroup>
          <NInput placeholder="NeteaseCloudMusicApi" v-model:value="settingStore.apiAudioUrl"></NInput>
          <NButton @click="testApiAudioUrlFn" :loading="test_login">测试</NButton>
        </NInputGroup>
      </p>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/store/module/setting";
import { useUserStore } from "@/store/module/user";
import { computed, ref, watch } from "vue";

const settingStore = useSettingStore();
const userStore = useUserStore();
const login = ref(false);
const test_login = ref(false);
// 取消测试
const test_controller = ref<AbortController | null>(null);

/** 游客登录 */
function touristLogin() {
  login.value = true;
  userStore.touristLogin().finally(() => {
    login.value = false;
  })
}

async function testApiAudioUrlFn() {
  if (test_controller.value) {
    test_controller.value.abort();
    test_controller.value = null;
  }
  try {
    const url = `${settingStore.apiAudioUrl}/register/anonimous`;
    test_login.value = true;
    // 取消请求
    test_controller.value = new AbortController();
    const res = await fetch(url, {
      signal: test_controller.value.signal,
    });

    if (res.ok) {
      settingStore.testApiAudioUrl = true;
      userStore.qrLogin(true);
    }
  } catch (e) {
    settingStore.testApiAudioUrl = false;
  } finally {
    test_login.value = false;
  }
}

watch(() => settingStore.showBottomPanel, (newVal) => {
  if (!settingStore.testApiAudioUrl) return;
  if (newVal === 'setting' && !userStore.cookie) {
    userStore.qrLogin(true);
  }
  if ((newVal === null || newVal === 'song_list') && !userStore.cookie) {
    userStore.qrLogin(false);
  }
})
const userStatus = computed(() => {
  // 未登入
  if (!userStore.cookie) return "NOT";
  // 游客
  if (userStore.account === null || userStore.profile === null) {
    return "TOURIST";
  }
  // 登入
  return "USER";
});

watch(() => settingStore.apiAudioUrl, () => {
  settingStore.testApiAudioUrl = false;
  // 清除登入状态
  userStore.setCookie('');
  test_login.value = false;
  if (test_controller.value) {
    test_controller.value.abort();
    test_controller.value = null;
  }
  userStore.qrLogin(false);
})
</script>