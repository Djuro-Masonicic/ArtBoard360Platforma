const assert = require('node:assert/strict');
const { test } = require('node:test');
const { normalizeCardSocialContact } = require('@artboard/qr-card-renderer');

for (const [platform, host] of [['instagram', 'instagram.com'], ['behance', 'behance.net']]) {
  test(`${platform} accepts handles and profile links and returns a stable HTTPS URL`, () => {
    for (const input of ['@artist.name', 'artist.name', ` ${host}/artist.name `, `http://${host}/artist.name`, `https://${host}/artist.name`]) {
      const url = normalizeCardSocialContact(platform, input);
      assert.equal(url, `https://${host}/artist.name`);
      assert.equal(normalizeCardSocialContact(platform, url), url);
    }
    assert.equal(normalizeCardSocialContact(platform, `www.${host}/artist?share=1`), `https://www.${host}/artist?share=1`);
    assert.equal(normalizeCardSocialContact(platform, '   '), '');
  });
  test(`${platform} rejects unsafe URLs, foreign hosts and malformed contacts`, () => {
    for (const input of ['@', 'javascript:alert(1)', 'data:text/html,test', `https://${host}.evil.invalid/artist`,
      `https://evil.invalid/${host}/artist`, `https://user@${host}/artist`, `https://${host}:8080/artist`,
      `https://${host}/`, `https://${host}/artist name`, `https://${host}\\@evil.invalid/artist`,
      '@artist\nname', `evil.invalid/artist`, 'a'.repeat(201)]) {
      assert.equal(normalizeCardSocialContact(platform, input), null, input);
    }
  });
}
