import { Titlebar, TitlebarColor } from 'custom-electron-titlebar';

window.addEventListener("DOMContentLoaded", () => {
  const titlebar = new Titlebar({
    backgroundColor: TitlebarColor.fromHex("#1e1e2e"),
    itemBackgroundColor: TitlebarColor.fromHex("#121212"),
    menu: null,
    enableMnemonics: false,
  });
  titlebar.updateTitle(`osu.direct`);

  const navHeader = Array.from(document.getElementsByClassName("header-fixed") as HTMLCollectionOf<HTMLElement>);
  const sidebar = Array.from(document.getElementsByClassName("sidepanel-container") as HTMLCollectionOf<HTMLElement>);
  const height = Array.from(document.getElementsByClassName("cet-container") as HTMLCollectionOf<HTMLElement>);

  const navHeight = height[0].style.top;
  navHeader.forEach(nav => nav.style.top = navHeight);
  sidebar.forEach(nav => nav.style.top = navHeight);

  document.querySelector('footer').remove();

  const toRemove = [2, 5, 6];
  const navItems = Array.from(document.getElementsByClassName("nav-item") as HTMLCollectionOf<HTMLElement>);

  const logoLink = navItems[0].firstElementChild;
  logoLink.setAttribute('href', "/browse");

  const objectsToRemove = [];
  for (const index of toRemove) {
    const navItem = navItems[index];
    if (navItem) objectsToRemove.push(navItem);
  }
  objectsToRemove.forEach(object => object.remove());
});
