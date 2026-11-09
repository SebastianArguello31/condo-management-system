import unittest
from unittest.mock import patch, sentinel

from werkzeug.exceptions import BadRequest, NotFound
from app.modules.users.services import specialties


class TestSpecialtyService(unittest.TestCase):
    def setUp(self):
        self.repo = self.enterContext(patch.object(specialties, "specialties_repo", autospec=True))
        self.transaction = self.enterContext(patch.object(specialties, "transaction"))
        self.cursor = self.transaction.return_value.__enter__.return_value
        self.manage = self.enterContext(patch.object(specialties, "lock_management"))
        self.repo.find_specialties.return_value = [{"id_especialidad": 1}]

    def test_cannot_remove_last_specialty(self):
        with self.assertRaises(BadRequest):
            specialties.unlink_specialty(7, 1, 2)
        self.repo.remove_user_specialty.assert_not_called()

    def test_missing_link_is_not_deleted(self):
        with self.assertRaises(NotFound):
            specialties.unlink_specialty(7, 99, 2)
        self.repo.remove_user_specialty.assert_not_called()

    def test_remove_one_of_multiple_specialties(self):
        self.repo.find_specialties.return_value.append({"id_especialidad": 3})
        specialties.unlink_specialty(7, 1, 2)
        self.manage.assert_called_once_with(self.cursor, 2, 7, "TECNICO")
        self.repo.remove_user_specialty.assert_called_once_with(7, 1, cursor=self.cursor)

    def test_replacement_deduplicates_and_sorts_ids(self):
        self.repo.lock_specialties.return_value = [
            {"id_especialidad": 1, "activo": True}, {"id_especialidad": 3, "activo": True},
        ]
        specialties.replace_specialties(sentinel.cursor, 7, [3, 1, 3])
        self.repo.lock_specialties.assert_called_once_with([1, 3], cursor=sentinel.cursor)
        self.repo.replace_user_specialties.assert_called_once_with(7, [1, 3], cursor=sentinel.cursor)

    def test_empty_replacement_is_rejected_before_write(self):
        with self.assertRaises(BadRequest):
            specialties.replace_specialties(sentinel.cursor, 7, [])
        self.repo.replace_user_specialties.assert_not_called()

    def test_missing_or_new_inactive_specialty_does_not_replace(self):
        for rows in ([], [{"id_especialidad": 3, "activo": False}]):
            with self.subTest(rows=rows):
                self.repo.lock_specialties.return_value = rows
                with self.assertRaises(BadRequest):
                    specialties.replace_specialties(sentinel.cursor, 7, [3])
        self.repo.replace_user_specialties.assert_not_called()

    def test_existing_inactive_specialty_can_be_retained(self):
        self.repo.lock_specialties.return_value = [{"id_especialidad": 1, "activo": False}]
        specialties.replace_specialties(sentinel.cursor, 7, [1])
        self.repo.replace_user_specialties.assert_called_once_with(7, [1], cursor=sentinel.cursor)
