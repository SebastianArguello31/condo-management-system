import hashlib
import unittest
from unittest.mock import patch

from werkzeug.exceptions import BadRequest
from app.modules.auth import password_reset as service


class TestPasswordResetService(unittest.TestCase):
    def setUp(self):
        self.transaction = self.enterContext(patch.object(service, "transaction"))
        self.cursor = self.transaction.return_value.__enter__.return_value
        self.repo = self.enterContext(patch.object(service, "repository", autospec=True))
        self.hash = self.enterContext(patch.object(service, "hash_password", return_value="hashed-password"))
        self.user = {"id_usuario": 7, "activo": True, "email": "user@example.com"}
        self.repo.lock_user_by_email.return_value = self.user
        self.repo.lock_user_by_id.return_value = self.user
        self.repo.find_token_owner.return_value = {"id_usuario": 7}
        self.repo.consume_reset_token.return_value = {"id": 1}
        self.token = "a" * 43
        self.digest = hashlib.sha256(self.token.encode()).hexdigest()

    def test_creation_normalizes_email_and_persists_only_digest(self):
        with patch.object(service.secrets, "token_urlsafe", return_value=self.token):
            result = service.create_password_reset("  USER@EXAMPLE.COM  ")
        self.assertEqual(result, {"email": "user@example.com", "token": self.token})
        self.repo.lock_user_by_email.assert_called_once_with("user@example.com", cursor=self.cursor)
        self.repo.insert_reset_token.assert_called_once_with(7, self.digest, cursor=self.cursor)

    def test_missing_or_inactive_account_does_not_create_token(self):
        for user in (None, {**self.user, "activo": False}):
            with self.subTest(user=user):
                self.repo.lock_user_by_email.return_value = user
                self.assertIsNone(service.create_password_reset("user@example.com"))
        self.repo.insert_reset_token.assert_not_called()

    def test_reset_updates_password_and_invalidates_links_in_same_transaction(self):
        service.reset_password(self.token, "new-password")
        self.repo.find_token_owner.assert_called_once_with(self.digest, cursor=self.cursor)
        self.repo.consume_reset_token.assert_called_once_with(7, self.digest, cursor=self.cursor)
        self.repo.update_password.assert_called_once_with(7, "hashed-password", cursor=self.cursor)
        self.repo.invalidate_pending_tokens.assert_called_once_with(7, cursor=self.cursor)
        self.transaction.assert_called_once_with()

    def test_unknown_expired_used_and_inactive_tokens_never_update_password(self):
        cases = [("find_token_owner", None), ("consume_reset_token", None),
                 ("lock_user_by_id", None), ("lock_user_by_id", {**self.user, "activo": False})]
        for method, value in cases:
            with self.subTest(method=method, value=value):
                mock = getattr(self.repo, method)
                previous = mock.return_value
                mock.return_value = value
                with self.assertRaises(BadRequest) as raised:
                    service.reset_password(self.token, "new-password")
                self.assertEqual(raised.exception.description, service.INVALID_TOKEN_MESSAGE)
                self.repo.update_password.assert_not_called()
                self.repo.invalidate_pending_tokens.assert_not_called()
                mock.return_value = previous

    def test_invalidation_failure_propagates_to_transaction(self):
        failure = RuntimeError("invalidation failed")
        self.repo.invalidate_pending_tokens.side_effect = failure
        with self.assertRaises(RuntimeError):
            service.reset_password(self.token, "new-password")
        self.assertEqual(self.transaction.return_value.__exit__.call_args.args[:2], (RuntimeError, failure))
