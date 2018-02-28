import reducer, {
  LOAD_USER_ACCOUNT,
  getCurrentUser,
  getDisplayName,
  fetchUserAccount,
  hasAnyReviewerRelatedPermission,
  hasPermission,
  initialState,
  loadCurrentUserAccount,
  loadUserAccount,
  logOutUser,
} from 'amo/reducers/users';
import {
  ADDONS_POSTREVIEW,
  ADDONS_CONTENTREVIEW,
  ADDONS_REVIEW,
  ALL_SUPER_POWERS,
  ADMIN_TOOLS_VIEW,
  COLLECTIONS_EDIT,
  STATS_VIEW,
  THEMES_REVIEW,
} from 'core/constants';
import {
  dispatchClientMetadata,
  dispatchSignInActions,
} from 'tests/unit/amo/helpers';
import {
  createStubErrorHandler,
  createUserAccountResponse,
} from 'tests/unit/helpers';


describe(__filename, () => {
  describe('reducer', () => {
    it('initializes properly', () => {
      const { byID, byUsername } = reducer(undefined, { type: 'NONE' });
      expect(byID).toEqual({});
      expect(byUsername).toEqual({});
    });

    it('ignores unrelated actions', () => {
      const state = reducer(undefined, loadUserAccount({
        user: createUserAccountResponse({ id: 12345, username: 'john' }),
      }));
      const newState = reducer(state, { type: 'UNRELATED' });
      expect(newState).toEqual(state);
    });

    it('throws when no errorHandlerId is passed to fetchUserAccount', () => {
      expect(() => {
        fetchUserAccount({ username: 'Cool Kat' });
      }).toThrowError('errorHandlerId is required');
    });

    it('throws when no username is passed to fetchUserAccount', () => {
      const errorHandlerId = createStubErrorHandler().id;
      expect(() => {
        fetchUserAccount({ errorHandlerId });
      }).toThrowError('username is required');
    });

    it('requires user for loadCurrentUserAccount', () => {
      expect(() => {
        loadCurrentUserAccount({});
      }).toThrowError('user is required');
    });

    it('loadUserAccount returns a user', () => {
      const user = createUserAccountResponse();
      const action = loadUserAccount({ user });

      expect(action.type).toEqual(LOAD_USER_ACCOUNT);
      expect(action.payload).toEqual({ user });
    });

    it('throws when no username is passed to loadUserAccount', () => {
      expect(() => {
        loadUserAccount({});
      }).toThrowError('user is required');
    });

    it('handles LOG_OUT_USER', () => {
      const state = reducer(initialState, loadCurrentUserAccount({
        user: createUserAccountResponse({ id: 12345, username: 'john' }),
      }));
      const { currentUserID } = reducer(state, logOutUser());

      expect(currentUserID).toEqual(null);
    });
  });

  describe('getCurrentUser selector', () => {
    it('returns a user when user is authenticated', () => {
      const { state } = dispatchSignInActions();

      expect(getCurrentUser(state.users))
        .toEqual(state.users.byID[state.users.currentUserID]);
    });

    it('returns null when user is not authenticated', () => {
      const { state } = dispatchClientMetadata();

      expect(getCurrentUser(state.users)).toEqual(null);
    });

    it('throws if currentUserID exists but user does not', () => {
      // This signifies a bug in our app:
      // https://github.com/mozilla/addons-frontend/pull/4031#discussion_r155665367
      const { state } = dispatchSignInActions();
      const buggyUsersState = {
        ...state,
        users: { ...state.users, byID: {}, byUsername: {} },
      };

      expect(() => {
        getCurrentUser(buggyUsersState.users);
      }).toThrowError(/currentUserID is defined but no matching user found/);
    });
  });

  describe('hasPermission selector', () => {
    it('returns `true` when user has the given permission', () => {
      const permissions = [ADMIN_TOOLS_VIEW, STATS_VIEW];
      const { state } = dispatchSignInActions({ user: { permissions } });

      expect(hasPermission(state, STATS_VIEW)).toEqual(true);
    });

    it('returns `false` when user does not have the given permission', () => {
      const permissions = [ADMIN_TOOLS_VIEW, STATS_VIEW];
      const { state } = dispatchSignInActions({ user: { permissions } });

      expect(hasPermission(state, THEMES_REVIEW)).toEqual(false);
    });

    it('returns `false` when user state has no permissions', () => {
      const { state } = dispatchSignInActions({ user: { permissions: null } });

      expect(hasPermission(state, THEMES_REVIEW)).toEqual(false);
    });

    it('returns `false` when user is not logged in', () => {
      const { state } = dispatchClientMetadata();

      expect(hasPermission(state, THEMES_REVIEW)).toEqual(false);
    });

    it('returns `true` when user is admin', () => {
      const permissions = [ALL_SUPER_POWERS];
      const { state } = dispatchSignInActions({ user: { permissions } });


      expect(hasPermission(state, THEMES_REVIEW)).toEqual(true);
    });
  });

  describe('hasAnyReviewerRelatedPermission selector', () => {
    it('returns `true` when user has ADDONS_POSTREVIEW', () => {
      const permissions = [ADDONS_POSTREVIEW, STATS_VIEW];
      const { state } = dispatchSignInActions({ user: { permissions } });

      expect(hasAnyReviewerRelatedPermission(state)).toEqual(true);
    });

    it('returns `true` when user has ADDONS_CONTENTREVIEW', () => {
      const permissions = [STATS_VIEW, ADDONS_CONTENTREVIEW];
      const { state } = dispatchSignInActions({ user: { permissions } });

      expect(hasAnyReviewerRelatedPermission(state)).toEqual(true);
    });

    it('returns `true` when user has ADDONS_REVIEW', () => {
      const permissions = [ADDONS_REVIEW];
      const { state } = dispatchSignInActions({ user: { permissions } });

      expect(hasAnyReviewerRelatedPermission(state)).toEqual(true);
    });

    it('returns `false` when user does not have any reviewer permissions', () => {
      const permissions = [COLLECTIONS_EDIT, STATS_VIEW];
      const { state } = dispatchSignInActions({ user: { permissions } });

      expect(hasAnyReviewerRelatedPermission(state)).toEqual(false);
    });

    it('returns `false` when user state has no permissions', () => {
      const { state } = dispatchSignInActions({ user: { permissions: null } });

      expect(hasAnyReviewerRelatedPermission(state)).toEqual(false);
    });

    it('returns `false` when user is not logged in', () => {
      const { state } = dispatchClientMetadata();

      expect(hasAnyReviewerRelatedPermission(state)).toEqual(false);
    });

    it('returns `true` when user is admin', () => {
      const permissions = [ALL_SUPER_POWERS];
      const { state } = dispatchSignInActions({ user: { permissions } });

      expect(hasAnyReviewerRelatedPermission(state)).toEqual(true);
    });
  });

  describe('getDisplayName selector', () => {
    it('sets the display name when user has a display name', () => {
      const displayName = 'King of the Elephants';
      const { state } = dispatchSignInActions({
        user: { display_name: displayName },
      });

      expect(getDisplayName(getCurrentUser(state.users))).toEqual(displayName);
    });

    it('returns the username when display name is null', () => {
      const username = 'babar';
      const displayName = null;
      const { state } = dispatchSignInActions({
        user: { display_name: displayName, username },
      });

      expect(getDisplayName(getCurrentUser(state.users))).toEqual(username);
    });

    it('returns the username when display name is undefined', () => {
      const username = 'babar';
      const displayName = undefined;
      const { state } = dispatchSignInActions({
        user: { display_name: displayName, username },
      });

      expect(getDisplayName(getCurrentUser(state.users))).toEqual(username);
    });

    it('returns the username when display name is an empty string', () => {
      const username = 'babar';
      const displayName = '';
      const { state } = dispatchSignInActions({
        user: { display_name: displayName, username },
      });

      expect(getDisplayName(getCurrentUser(state.users))).toEqual(username);
    });

    it('returns the username when user did not define a display name', () => {
      const username = 'babar';
      const { state } = dispatchSignInActions({
        user: { display_name: undefined, username },
      });

      expect(getDisplayName(getCurrentUser(state.users))).toEqual(username);
    });
  });
});
