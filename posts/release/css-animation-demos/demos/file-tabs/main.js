export default function () {
  document.querySelector('.file-tabs__folder-back').onclick = function (ev) {
    const el = ev.currentTarget;
    if (el) {
      el.classList.toggle('open');
    }
  }
}
