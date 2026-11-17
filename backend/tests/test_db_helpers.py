import unittest
from unittest.mock import MagicMock, patch

from werkzeug.exceptions import BadRequest
from app.core import db_helpers


class TestTransactions(unittest.TestCase):
    def setUp(self):
        self.connection = MagicMock()
        self.cursor = MagicMock()
        self.connection.cursor.return_value.__enter__.return_value = self.cursor
        self.connect = self.enterContext(patch.object(
            db_helpers, "get_connection", return_value=self.connection,
        ))

    def test_success_exits_transaction_and_closes_connection(self):
        with db_helpers.transaction() as cursor:
            self.assertIs(cursor, self.cursor)
            self.connection.close.assert_not_called()
        self.connection.__exit__.assert_called_once_with(None, None, None)
        self.connection.close.assert_called_once_with()

    def test_error_reaches_transaction_context_and_connection_closes(self):
        failure = RuntimeError("write failed")
        with self.assertRaises(RuntimeError) as raised:
            with db_helpers.transaction():
                raise failure
        self.assertIs(raised.exception, failure)
        args = self.connection.__exit__.call_args.args
        self.assertEqual(args[:2], (RuntimeError, failure))
        self.connection.close.assert_called_once_with()

    def test_cursor_creation_failure_still_closes_connection(self):
        self.connection.cursor.side_effect = RuntimeError("cursor failed")
        with self.assertRaises(RuntimeError):
            with db_helpers.transaction():
                self.fail("must not enter")
        self.connection.close.assert_called_once_with()

    def test_query_reuses_cursor_without_opening_transaction(self):
        self.cursor.fetchone.return_value = {"id": 1}
        result = db_helpers.query("SELECT %s", (1,), cursor=self.cursor)
        self.assertEqual(result, {"id": 1})
        self.cursor.execute.assert_called_once_with("SELECT %s", (1,))
        self.connect.assert_not_called()

    def test_query_many_and_statement_without_results(self):
        self.cursor.fetchall.return_value = [{"id": 1}, {"id": 2}]
        self.assertEqual(db_helpers.query("SELECT id", many=True), [{"id": 1}, {"id": 2}])
        self.cursor.description = None
        self.cursor.reset_mock()
        self.assertIsNone(db_helpers.query("UPDATE items", cursor=self.cursor))
        self.cursor.fetchone.assert_not_called()
        self.cursor.fetchall.assert_not_called()

    def test_invalid_update_never_opens_connection(self):
        for data in ({}, {"password_hash": "injected"}):
            with self.subTest(data=data), self.assertRaises(BadRequest):
                db_helpers.update_record("users", "id", 1, data, {"nombre"})
        self.connect.assert_not_called()
