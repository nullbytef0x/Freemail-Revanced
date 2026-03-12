/**
 * 邮箱操作模块
 * @module modules/app/mailbox-actions
 */

import { setCurrentMailbox, getCurrentMailbox, clearCurrentMailbox, setCurrentMailboxInfo } from './mailbox-state.js';
import { setButtonLoading, restoreButton } from './ui-helpers.js';
import { generateRandomId } from './random-name.js';
import { getStoredLength, saveLength, getSelectedDomainIndex } from './domains.js';
import { startAutoRefresh, stopAutoRefresh } from './auto-refresh.js';
import { resetPager } from './email-list.js';
import { resetMbPage } from './mailbox-list.js';

/**
 * 生成随机邮箱
 * @param {object} elements - DOM 元素
 * @param {HTMLInputElement} lenRange - 长度滑块
 * @param {HTMLSelectElement} domainSelect - 域名选择器
 * @param {Function} api - API 函数
 * @param {Function} showToast - 提示函数
 * @param {Function} refresh - 刷新函数
 * @param {Function} loadMailboxes - 加载邮箱函数
 * @param {Function} autoRefreshCallback - 自动刷新回调
 */
export async function generateMailbox(elements, lenRange, domainSelect, api, showToast, refresh, loadMailboxes, autoRefreshCallback, updateMailboxInfoUI) {
  const { gen, email, emailActions, listCard } = elements;
  
  try {
    setButtonLoading(gen, 'Generating...');
    const len = Number(lenRange?.value || getStoredLength());
    const domainIndex = getSelectedDomainIndex(domainSelect);
    
    const r = await api(`/api/generate?length=${len}&domainIndex=${domainIndex}`);
    if (!r.ok) throw new Error(await r.text());
    
    const data = await r.json();
    saveLength(len);
    
    setCurrentMailbox(data.email);
    updateEmailDisplay(elements, data.email);
    
    // 获取完整的邮箱信息（包括 id、is_favorite 等）
    try {
      const infoRes = await api(`/api/mailbox/info?address=${encodeURIComponent(data.email)}`);
      if (infoRes.ok) {
        const info = await infoRes.json();
        setCurrentMailboxInfo(info);
        if (updateMailboxInfoUI) updateMailboxInfoUI(info);
      }
    } catch(_) {}
    
    showToast('Mailbox generated successfully!', 'success');
    startAutoRefresh(autoRefreshCallback);
    await refresh();
    
    resetMbPage();
    await loadMailboxes({ forceFresh: true });
  } catch(e) {
    showToast(e.message || 'Generation failed', 'error');
  } finally {
    restoreButton(gen);
  }
}

/**
 * 生成随机人名邮箱
 * @param {object} elements - DOM 元素
 * @param {HTMLInputElement} lenRange - 长度滑块
 * @param {HTMLSelectElement} domainSelect - 域名选择器
 * @param {Function} api - API 函数
 * @param {Function} showToast - 提示函数
 * @param {Function} refresh - 刷新函数
 * @param {Function} loadMailboxes - 加载邮箱函数
 * @param {Function} autoRefreshCallback - 自动刷新回调
 */
export async function generateNameMailbox(elements, lenRange, domainSelect, api, showToast, refresh, loadMailboxes, autoRefreshCallback, updateMailboxInfoUI) {
  const { genName } = elements;
  
  try {
    setButtonLoading(genName, 'Generating...');
    const len = Number(lenRange?.value || getStoredLength());
    const domainIndex = getSelectedDomainIndex(domainSelect);
    const localName = generateRandomId(len);
    
    const r = await api('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local: localName, domainIndex })
    });
    
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    saveLength(len);
    
    setCurrentMailbox(data.email);
    updateEmailDisplay(elements, data.email);
    
    // 获取完整的邮箱信息（包括 id、is_favorite 等）
    try {
      const infoRes = await api(`/api/mailbox/info?address=${encodeURIComponent(data.email)}`);
      if (infoRes.ok) {
        const info = await infoRes.json();
        setCurrentMailboxInfo(info);
        if (updateMailboxInfoUI) updateMailboxInfoUI(info);
      }
    } catch(_) {}
    
    showToast('Mailbox generated with random name!', 'success');
    startAutoRefresh(autoRefreshCallback);
    await refresh();
    
    resetMbPage();
    await loadMailboxes({ forceFresh: true });
  } catch(e) {
    showToast(e.message || 'Generation failed', 'error');
  } finally {
    restoreButton(genName);
  }
}

/**
 * 创建自定义邮箱
 * @param {object} elements - DOM 元素
 * @param {HTMLSelectElement} domainSelect - 域名选择器
 * @param {Function} api - API 函数
 * @param {Function} showToast - 提示函数
 * @param {Function} loadMailboxes - 加载邮箱函数
 */
export async function createCustomMailbox(elements, domainSelect, api, showToast, loadMailboxes) {
  const { customLocalOverlay, customOverlay } = elements;
  
  try {
    const local = (customLocalOverlay?.value || '').trim();
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(local)) {
      showToast('Invalid username. Use letters/numbers/._- only', 'warn');
      return;
    }
    const domainIndex = getSelectedDomainIndex(domainSelect);
    
    const r = await api('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local, domainIndex })
    });
    
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    
    setCurrentMailbox(data.email);
    updateEmailDisplay(elements, data.email);
    if (customOverlay) customOverlay.style.display = 'none';
    
    showToast('Mailbox created: ' + data.email, 'success');
    await loadMailboxes({ forceFresh: true });
  } catch(e) {
    showToast(e.message || 'Creation failed', 'error');
  }
}

/**
 * 更新邮箱显示
 * @param {object} elements - DOM 元素
 * @param {string} address - 邮箱地址
 */
export function updateEmailDisplay(elements, address) {
  const { email, emailActions, listCard } = elements;
  const emailText = document.getElementById('email-text');
  if (emailText) emailText.textContent = address;
  else if (email) email.textContent = address;
  
  email?.classList.add('has-email');
  if (emailActions) emailActions.style.display = 'flex';
  if (listCard) listCard.style.display = 'block';
}

/**
 * 选择邮箱
 * @param {string} address - 邮箱地址
 * @param {object} elements - DOM 元素
 * @param {Function} api - API 函数
 * @param {Function} refresh - 刷新函数
 * @param {Function} autoRefreshCallback - 自动刷新回调
 * @param {Function} updateMailboxInfoUI - 更新邮箱信息UI函数
 */
export async function selectMailboxAddress(address, elements, api, refresh, autoRefreshCallback, updateMailboxInfoUI) {
  setCurrentMailbox(address);
  updateEmailDisplay(elements, address);
  
  // 更新侧边栏选中状态
  document.querySelectorAll('.mailbox-item').forEach(el => {
    el.classList.toggle('active', el.querySelector('.address')?.textContent === address);
  });
  
  // 加载邮箱信息
  try {
    const r = await api(`/api/mailbox/info?address=${encodeURIComponent(address)}`);
    if (r.ok) {
      const info = await r.json();
      setCurrentMailboxInfo(info);
      updateMailboxInfoUI(info);
    }
  } catch(_) {}
  
  // 重置分页并刷新
  resetPager(elements);
  startAutoRefresh(autoRefreshCallback);
  await refresh();
}

/**
 * 置顶/取消置顶邮箱
 * @param {Event} event - 事件
 * @param {string} address - 邮箱地址
 * @param {Function} api - API 函数
 * @param {Function} showToast - 提示函数
 * @param {Function} loadMailboxes - 加载邮箱函数
 */
export async function toggleMailboxPin(event, address, api, showToast, loadMailboxes) {
  event.stopPropagation();
  try {
    const r = await api(`/api/mailboxes/pin?address=${encodeURIComponent(address)}`, { method: 'POST' });
    if (r.ok) {
      showToast('Done', 'success');
      await loadMailboxes({ forceFresh: true });
    }
  } catch(e) {
    showToast(e.message || 'Operation failed', 'error');
  }
}

/**
 * 删除邮箱
 * @param {Event} event - 事件
 * @param {string} address - 邮箱地址
 * @param {object} elements - DOM 元素
 * @param {Function} api - API 函数
 * @param {Function} showToast - 提示函数
 * @param {Function} showConfirm - 确认函数
 * @param {Function} loadMailboxes - 加载邮箱函数
 */
export async function deleteMailboxAddress(event, address, elements, api, showToast, showConfirm, loadMailboxes) {
  event.stopPropagation();
  const confirmed = await showConfirm(`Delete mailbox ${address}? All emails will be removed.`);
  if (!confirmed) return;
  
  try {
    const r = await api(`/api/mailboxes?address=${encodeURIComponent(address)}`, { method: 'DELETE' });
    if (r.ok) {
      showToast('Mailbox deleted', 'success');
      if (getCurrentMailbox() === address) {
        clearCurrentMailbox();
        if (elements.email) elements.email.textContent = 'Click Generate to create a mailbox';
        elements.email?.classList.remove('has-email');
        if (elements.emailActions) elements.emailActions.style.display = 'none';
        if (elements.list) elements.list.innerHTML = '';
        stopAutoRefresh();
      }
      await loadMailboxes({ forceFresh: true });
    }
  } catch(e) {
    showToast(e.message || 'Delete failed', 'error');
  }
}

/**
 * 复制邮箱地址
 * @param {Function} showToast - 提示函数
 */
export async function copyMailboxAddress(showToast) {
  const mailbox = getCurrentMailbox();
  if (!mailbox) {
    showToast('Please generate or select a mailbox first', 'warn');
    return;
  }
  try {
    await navigator.clipboard.writeText(mailbox);
    showToast(`Copied: ${mailbox}`, 'success');
  } catch(_) {
    showToast('Copy failed', 'error');
  }
}

/**
 * 清空邮件
 * @param {Function} api - API 函数
 * @param {Function} showToast - 提示函数
 * @param {Function} showConfirm - 确认函数
 * @param {Function} refresh - 刷新函数
 */
export async function clearAllEmails(api, showToast, showConfirm, refresh) {
  const mailbox = getCurrentMailbox();
  if (!mailbox) {
    showToast('Please select a mailbox first', 'warn');
    return;
  }
  const confirmed = await showConfirm(`Clear all emails for ${mailbox}?`);
  if (!confirmed) return;
  
  try {
    const r = await api(`/api/emails?mailbox=${encodeURIComponent(mailbox)}`, { method: 'DELETE' });
    if (r.ok) {
      showToast('Emails cleared', 'success');
      await refresh();
    }
  } catch(e) {
    showToast(e.message || 'Clear failed', 'error');
  }
}

/**
 * 登出
 * @param {Function} api - API 函数
 */
export async function logout(api) {
  try {
    await api('/api/logout', { method: 'POST' });
  } catch(_) {}
  
  try {
    clearCurrentMailbox();
  } catch(_) {}
  
  try {
    stopAutoRefresh();
  } catch(_) {}
  
  // 确保跳转一定执行
  window.location.replace('/html/login.html');
}

export default {
  generateMailbox,
  generateNameMailbox,
  createCustomMailbox,
  updateEmailDisplay,
  selectMailboxAddress,
  toggleMailboxPin,
  deleteMailboxAddress,
  copyMailboxAddress,
  clearAllEmails,
  logout
};
