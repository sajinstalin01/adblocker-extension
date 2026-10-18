const $ = id => document.getElementById(id);
async function render() {
  const { enabled = true, allowlist = [] } = await chrome.storage.local.get({ enabled: true, allowlist: [] });
  $("enabled").checked = enabled;
  $("list").replaceChildren();
  [...allowlist].sort().forEach(host => {
    const li = document.createElement("li"), label = document.createElement("span"), remove = document.createElement("button");
    label.textContent = host; remove.textContent = "Remove"; remove.type = "button";
    remove.addEventListener("click", async () => {
      const { allowlist: latest = [] } = await chrome.storage.local.get("allowlist");
      await chrome.storage.local.set({ allowlist: latest.filter(item => item !== host) });
      $("message").textContent = "Removed " + host; await render();
    });
    li.append(label, remove); $("list").append(li);
  });
}
$("enabled").addEventListener("change", e => chrome.storage.local.set({ enabled: e.target.checked }));
$("addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const raw = $("host").value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  if (!raw || raw.includes(" ") || raw.startsWith(".") || raw.endsWith(".") || !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/.test(raw)) {
    $("message").textContent = "Enter a valid domain name, e.g. example.com."; return;
  }
  const { allowlist = [] } = await chrome.storage.local.get("allowlist");
  if (allowlist.includes(raw)) { $("message").textContent = "That domain is already allowlisted."; return; }
  await chrome.storage.local.set({ allowlist: [...allowlist, raw] });
  $("host").value = ""; $("message").textContent = "Added " + raw; await render();
});
render();