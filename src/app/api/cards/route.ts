import { NextRequest, NextResponse } from "next/server";
import { saveBusinessCard } from "@/lib/businessCardStorage";

interface CreateCardRequest {
  firstName: string;
  lastName: string;
  position: string;
  company: string;
  phone: string;
  email: string;
  website?: string;
  address?: string;
  photoUrl?: string;
  description?: string;
  socialLinks: {
    vkontakte?: string;
    telegram?: string;
    instagram?: string;
    facebook?: string;
  };
}

/**
 * POST /api/cards - Создание новой визитки
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateCardRequest = await request.json();

    // Валидация обязательных полей
    if (
      !body.firstName ||
      !body.lastName ||
      !body.position ||
      !body.company ||
      !body.phone ||
      !body.email
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Не все обязательные поля заполнены",
        },
        { status: 400 }
      );
    }

    // Сохранение визитки
    const businessCard = await saveBusinessCard({
      firstName: body.firstName,
      lastName: body.lastName,
      position: body.position,
      company: body.company,
      phone: body.phone,
      email: body.email,
      website: body.website,
      address: body.address,
      photoUrl: body.photoUrl,
      description: body.description,
      socialLinks: body.socialLinks || {},
    });

    return NextResponse.json(
      {
        success: true,
        card: businessCard,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка при создании визитки",
      },
      { status: 500 }
    );
  }
}

