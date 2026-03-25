from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Note


class NoteApiTests(APITestCase):
    def test_create_note(self):
        response = self.client.post(
            reverse("note-list"),
            {"title": "Test note", "description": "description"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Note.objects.count(), 1)

    def test_list_notes(self):
        Note.objects.create(title="One", description="A")
        Note.objects.create(title="Two", description="B")
        response = self.client.get(reverse("note-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(len(response.data["results"]), 2)

    def test_update_note(self):
        note = Note.objects.create(title="Old title", description="Old description")
        response = self.client.patch(
            reverse("note-detail", kwargs={"pk": note.id}),
            {"title": "New title"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.title, "New title")

    def test_delete_note(self):
        note = Note.objects.create(title="To delete", description="")
        response = self.client.delete(reverse("note-detail", kwargs={"pk": note.id}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Note.objects.count(), 0)

