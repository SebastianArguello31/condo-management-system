import socket
import unittest

import psycopg2
from tests import ExternalConnectionError


class TestIsolation(unittest.TestCase):
    def test_postgres_connections_are_blocked(self):
        with self.assertRaises(ExternalConnectionError):
            psycopg2.connect("dbname=must_not_connect")

    def test_socket_connections_are_blocked(self):
        with socket.socket() as connection:
            for method in (connection.connect, connection.connect_ex):
                with self.subTest(method=method), self.assertRaises(ExternalConnectionError):
                    method(("127.0.0.1", 1))
