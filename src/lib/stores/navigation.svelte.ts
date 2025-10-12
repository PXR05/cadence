interface Breadcrumb {
  label: string;
  path: string;
}

interface NavigationState {
  breadcrumbs: Breadcrumb[];
  title: string;
}

class NavigationStore {
  private state = $state<NavigationState>({
    breadcrumbs: [],
    title: "",
  });

  get breadcrumbs() {
    return this.state.breadcrumbs;
  }

  get title() {
    return this.state.title;
  }

  setBreadcrumbs(breadcrumbs: Breadcrumb[]) {
    this.state.breadcrumbs = breadcrumbs;
  }

  setTitle(title: string) {
    this.state.title = title;
  }

  setNavigation(breadcrumbs: Breadcrumb[], title: string) {
    this.state = { breadcrumbs, title };
  }

  clear() {
    this.state = { breadcrumbs: [], title: "" };
  }
}

export const navigationStore = new NavigationStore();
