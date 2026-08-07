import { test, expect } from '@playwright/test';
import { EventType } from 'matrix-js-sdk';
import {
  createPrivateEncryptedRoom,
  externalUserOptions,
  loginWithNewUser,
  standardUserOptions,
} from './room-utils';
import { MasAdminClient } from '../../../../utils/mas-admin';
import type { MatrixApi } from '../../../../utils/matrix-api';
import { INVITED_EMAIL_DOMAIN } from '../../../../utils/config';

/**
 * Creates an unrestricted room (rule "unrestricted") that external users can be
 * invited into. This maps to the "unrestricted room" used in the TU tests of
 * the room-access-rules module (test_event_allowed.py).
 */
export async function createUnrestrictedRoom(
  matrix: MatrixApi,
  name: string = 'Unrestricted Room'
): Promise<string> {
  return matrix.createRoom({
    name,
    joinRule: 'invite',
    preset: 'private_chat',
    visibility: 'private',
    accessRules: {
      rule: 'unrestricted',
      visibility: 'private',
    },
  });
}

test.describe('API - External restriction', () => {
  let externalUser: any;
  let externalMasAdmin: MasAdminClient;
  let matrix: MatrixApi;
  let masAdminClient: MasAdminClient;
  let masId: string;

  test.beforeAll(async () => {
    externalMasAdmin = await MasAdminClient.createExternalMAS();
    externalUser = await loginWithNewUser(externalMasAdmin, externalUserOptions());

    masAdminClient = await MasAdminClient.createDefaultMAS();
    const userData = await loginWithNewUser(masAdminClient, standardUserOptions());
    matrix = userData.matrix;
    masId = userData.masId;
  });

  test('External users can not create rooms', async () => {
    await expect(createPrivateEncryptedRoom(externalUser.matrix)).rejects.toMatchObject({
      httpStatus: 403,
    });
  });

  test('External users get empty results when searching user directory ', async () => {
    //create new user to search for
    const masAdmin = await MasAdminClient.createDefaultMAS();
    const user = await loginWithNewUser(masAdmin, standardUserOptions());

    await expect(
      externalUser.matrix.getClient().searchUserDirectory({ term: user.username })
    ).resolves.toMatchObject({ results: [] });

    await masAdmin.deactivateUser(user.masId);
  });

  // TU test_event_allowed.py::test_restricted
  test('Should return 403 error when inviting external user in restricted room', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    // inviting an MXID from a forbidden HS (external user) isn't allowed in restricted rooms
    await expect(matrix.getClient().invite(roomId, externalUser.mxId)).rejects.toMatchObject({
      httpStatus: 403,
    });
  });

  test('Should allow inviting standard user in restricted room', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);
    const user = await loginWithNewUser(masAdminClient, standardUserOptions());

    // inviting an MXID from an allowed HS is allowed in restricted rooms
    await expect(matrix.getClient().invite(roomId, user.mxId)).resolves.toBeDefined();

    await masAdminClient.deactivateUser(user.masId);
  });

  test('Should return 403 error when sending 3PID invite to external email in restricted room', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);
    const externalEmail = `${externalUser.username}@${INVITED_EMAIL_DOMAIN}`;

    // The module rejects the 3PID invite before contacting the identity server, so
    // a placeholder identity server URL is enough to trigger the check.
    matrix.getClient().setIdentityServerUrl('https://example.org');

    // inviting an email address from a forbidden HS isn't allowed in restricted rooms
    await expect(matrix.getClient().inviteByEmail(roomId, externalEmail)).rejects.toMatchObject({
      httpStatus: 403,
    });
  });

  // TU test_event_allowed.py::test_unrestricted
  test('Should allow inviting external user in unrestricted room', async () => {
    const roomId = await createUnrestrictedRoom(matrix);

    // in unrestricted mode we can invite whoever we want, even from a forbidden HS
    await expect(matrix.getClient().invite(roomId, externalUser.mxId)).resolves.toBeDefined();
  });

  test('Should allow setting power level for standard user in unrestricted room', async () => {
    const roomId = await createUnrestrictedRoom(matrix);
    const user = await loginWithNewUser(masAdminClient, standardUserOptions());
    const currentPowerLevels = await matrix.getClient().getStateEvent(
      roomId,
      EventType.RoomPowerLevels,
      ''
    );

    // a power level event that doesn't redefine the default PL nor sets a non-default
    // PL for a user that would be forbidden in restricted mode is allowed
    await expect(
      matrix.sendStateEvent(roomId, EventType.RoomPowerLevels, {
        ...currentPowerLevels,
        users: { ...currentPowerLevels.users, [user.mxId]: 10 },
      })
    ).resolves.toBeDefined();

    await masAdminClient.deactivateUser(user.masId);
  });

  test('Should return 403 error when redefining users_default power level in unrestricted room', async () => {
    const roomId = await createUnrestrictedRoom(matrix);
    const currentPowerLevels = await matrix.getClient().getStateEvent(
      roomId,
      EventType.RoomPowerLevels,
      ''
    );

    // a power level event that redefines the default PL is not allowed
    await expect(
      matrix.sendStateEvent(roomId, EventType.RoomPowerLevels, {
        ...currentPowerLevels,
        users_default: 10,
      })
    ).rejects.toMatchObject({ httpStatus: 403 });
  });

  test('Should return 403 error when setting power level for external user in unrestricted room', async () => {
    const roomId = await createUnrestrictedRoom(matrix);
    const currentPowerLevels = await matrix.getClient().getStateEvent(
      roomId,
      EventType.RoomPowerLevels,
      ''
    );

    // a power level event that sets a non-default PL for a user that would be
    // forbidden in restricted mode is not allowed
    await expect(
      matrix.sendStateEvent(roomId, EventType.RoomPowerLevels, {
        ...currentPowerLevels,
        users: { ...currentPowerLevels.users, [externalUser.mxId]: 10 },
        users_default: 10,
      })
    ).rejects.toMatchObject({ httpStatus: 403 });
  });

  // TU test_event_allowed.py::test_forbidden_users_join
  test('Should return 403 error when external user joins restricted room', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    // forbidden users cannot join restricted rooms
    await expect(externalUser.matrix.getClient().joinRoom(roomId)).rejects.toMatchObject({
      httpStatus: 403,
    });
  });

  test('Should allow external user to join unrestricted room when invited', async () => {
    const roomId = await createUnrestrictedRoom(matrix);

    // forbidden users can join an unrestricted room if they have been invited into it
    await matrix.getClient().invite(roomId, externalUser.mxId);
    await expect(externalUser.matrix.getClient().joinRoom(roomId)).resolves.toBeDefined();
  });

  test.afterAll(async () => {
    await externalMasAdmin.deactivateUser(externalUser.masId);
    await masAdminClient.deactivateUser(masId);
  });
});
